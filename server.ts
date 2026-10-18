import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  gender: string;
  age: number;
  city: string;
  interests: string[];
  statusMessage: string;
  createdAt: number;
  lastActive: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio';
  audioDuration?: number;
  timestamp: number;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: [string, string];
  lastMessage?: Message;
  updatedAt: number;
}

export interface PostComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: number;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userCity: string;
  userGender: string;
  imageUrl: string;
  caption: string;
  mood?: string;
  likes: string[]; // user IDs
  comments: PostComment[];
  createdAt: number;
}

interface DB {
  users: Record<string, User>;
  conversations: Record<string, Conversation>;
  messages: Record<string, Message[]>; // conversationId -> messages
  posts: Record<string, Post>;
}

// Load initial database
function loadDB(): DB {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        users: parsed.users || {},
        conversations: parsed.conversations || {},
        messages: parsed.messages || {},
        posts: parsed.posts || {},
      };
    }
  } catch (err) {
    console.error('Error reading db.json, starting fresh', err);
  }
  return {
    users: {},
    conversations: {},
    messages: {},
    posts: {},
  };
}

const db: DB = loadDB();

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db.json', err);
  }
}

// Runtime tracking
const userSockets = new Map<string, Set<WebSocket>>();
// Random stranger matchmaking queue: array of { userId: string, ws: WebSocket, interests?: string[] }
let strangerQueue: Array<{ userId: string; ws: WebSocket; interests?: string[] }> = [];

// Active stranger sessions: sessionId -> { id, user1Id, user2Id, createdAt, messages: [] }
interface StrangerSession {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: number;
  messages: Array<{
    id: string;
    senderId: string;
    text: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'audio';
    timestamp: number;
  }>;
}
const strangerSessions = new Map<string, StrangerSession>();
const userStrangerSession = new Map<string, string>(); // userId -> sessionId

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Broadcast presence event to all connected users
  function broadcastPresence(userId: string, isOnline: boolean) {
    const payload = JSON.stringify({
      type: 'presence',
      userId,
      isOnline,
      lastActive: Date.now(),
    });
    for (const [, sockets] of userSockets.entries()) {
      for (const ws of sockets) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      }
    }
  }

  // Send to specific user's sockets
  function sendToUser(userId: string, data: object) {
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    const msg = JSON.stringify(data);
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    }
  }

  // WebSocket handling
  wss.on('connection', (ws: WebSocket) => {
    let currentUserId: string | null = null;

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === 'auth') {
          currentUserId = data.userId;
          if (currentUserId && db.users[currentUserId]) {
            if (!userSockets.has(currentUserId)) {
              userSockets.set(currentUserId, new Set());
            }
            userSockets.get(currentUserId)!.add(ws);
            db.users[currentUserId].lastActive = Date.now();
            saveDB();
            broadcastPresence(currentUserId, true);

            // Send confirmation + current online users
            const onlineUserIds = Array.from(userSockets.keys()).filter((uid) => {
              const s = userSockets.get(uid);
              return s && s.size > 0;
            });

            ws.send(
              JSON.stringify({
                type: 'auth_ok',
                userId: currentUserId,
                onlineUserIds,
              })
            );
          }
        }

        if (data.type === 'typing') {
          // direct chat typing indicator
          if (data.recipientId && currentUserId) {
            sendToUser(data.recipientId, {
              type: 'typing',
              senderId: currentUserId,
              conversationId: data.conversationId,
              isTyping: !!data.isTyping,
            });
          }
        }

        if (data.type === 'stranger_typing') {
          if (currentUserId) {
            const sessId = userStrangerSession.get(currentUserId);
            if (sessId && strangerSessions.has(sessId)) {
              const sess = strangerSessions.get(sessId)!;
              const partnerId = sess.user1Id === currentUserId ? sess.user2Id : sess.user1Id;
              sendToUser(partnerId, {
                type: 'stranger_typing',
                sessionId: sessId,
                isTyping: !!data.isTyping,
              });
            }
          }
        }

        if (data.type === 'stranger_msg') {
          if (currentUserId) {
            const sessId = userStrangerSession.get(currentUserId);
            if (sessId && strangerSessions.has(sessId)) {
              const sess = strangerSessions.get(sessId)!;
              const partnerId = sess.user1Id === currentUserId ? sess.user2Id : sess.user1Id;
              const newMsg = {
                id: 'sm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                senderId: currentUserId,
                text: data.text || '',
                mediaUrl: data.mediaUrl,
                mediaType: data.mediaType,
                timestamp: Date.now(),
              };
              sess.messages.push(newMsg);

              // Deliver to both participants
              const outPayload = {
                type: 'stranger_message',
                sessionId: sessId,
                message: newMsg,
              };
              sendToUser(sess.user1Id, outPayload);
              sendToUser(sess.user2Id, outPayload);
            }
          }
        }
      } catch (err) {
        console.error('WS message parse error:', err);
      }
    });

    ws.on('close', () => {
      if (currentUserId) {
        const sockets = userSockets.get(currentUserId);
        if (sockets) {
          sockets.delete(ws);
          if (sockets.size === 0) {
            userSockets.delete(currentUserId);
            if (db.users[currentUserId]) {
              db.users[currentUserId].lastActive = Date.now();
              saveDB();
            }
            broadcastPresence(currentUserId, false);
          }
        }

        // Remove from stranger queue
        strangerQueue = strangerQueue.filter((item) => item.userId !== currentUserId);

        // If in stranger session, notify partner
        const sessId = userStrangerSession.get(currentUserId);
        if (sessId && strangerSessions.has(sessId)) {
          const sess = strangerSessions.get(sessId)!;
          const partnerId = sess.user1Id === currentUserId ? sess.user2Id : sess.user1Id;
          strangerSessions.delete(sessId);
          userStrangerSession.delete(sess.user1Id);
          userStrangerSession.delete(sess.user2Id);

          sendToUser(partnerId, {
            type: 'stranger_partner_left',
            sessionId: sessId,
            reason: 'Stranger has disconnected.',
          });
        }
      }
    });
  });

  // REST API ROUTES
  // 1. Health check & app stats
  app.get('/api/stats', (_req: Request, res: Response) => {
    const totalUsers = Object.keys(db.users).length;
    const onlineCount = userSockets.size;
    const totalMessages = Object.values(db.messages).reduce((acc, m) => acc + m.length, 0);
    const activeStrangerChats = strangerSessions.size;
    const totalPosts = Object.keys(db.posts || {}).length;

    res.json({
      totalRegisteredUsers: totalUsers,
      onlineUsers: onlineCount,
      totalMessages,
      activeStrangerChats,
      queueLength: strangerQueue.length,
      totalPosts,
    });
  });

  // 2. Auth: Register real user profile
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { username, displayName, avatar, bio, gender, age, city, interests, statusMessage } = req.body;

    if (!username || !displayName) {
      res.status(400).json({ error: 'Username and display name are required' });
      return;
    }

    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername) {
      res.status(400).json({ error: 'Please enter a valid alphanumeric username' });
      return;
    }

    // Check if username already exists
    const existing = Object.values(db.users).find((u) => u.username === cleanUsername);
    if (existing) {
      // Return existing user for easy login/switch
      existing.lastActive = Date.now();
      saveDB();
      res.json({ user: existing, message: 'Logged in as existing user' });
      return;
    }

    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const newUser: User = {
      id: userId,
      username: cleanUsername,
      displayName: displayName.trim(),
      avatar: avatar || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${cleanUsername}`,
      bio: bio ? bio.trim() : 'Looking for friendly chats and new connections!',
      gender: gender || 'Not specified',
      age: Number(age) || 21,
      city: city ? city.trim() : 'Global',
      interests: Array.isArray(interests) ? interests.filter(Boolean) : ['Chat', 'Music', 'Movies'],
      statusMessage: statusMessage ? statusMessage.trim() : 'Online & ready to talk',
      createdAt: Date.now(),
      lastActive: Date.now(),
    };

    db.users[userId] = newUser;
    saveDB();

    res.status(201).json({ user: newUser, message: 'Profile created successfully' });
  });

  // 3. Auth: Quick login / switch by username or ID
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, userId } = req.body;
    let user: User | undefined;

    if (userId && db.users[userId]) {
      user = db.users[userId];
    } else if (username) {
      const cleanUsername = username.toLowerCase().trim();
      user = Object.values(db.users).find((u) => u.username === cleanUsername);
    }

    if (!user) {
      res.status(404).json({ error: 'User profile not found. Please register.' });
      return;
    }

    user.lastActive = Date.now();
    saveDB();
    res.json({ user });
  });

  // 4. Update Profile
  app.put('/api/users/profile', (req: Request, res: Response) => {
    const { userId, displayName, avatar, bio, gender, age, city, interests, statusMessage } = req.body;
    if (!userId || !db.users[userId]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = db.users[userId];
    if (displayName) user.displayName = displayName.trim();
    if (avatar) user.avatar = avatar;
    if (bio !== undefined) user.bio = bio.trim();
    if (gender) user.gender = gender;
    if (age) user.age = Number(age);
    if (city !== undefined) user.city = city.trim();
    if (interests && Array.isArray(interests)) user.interests = interests;
    if (statusMessage !== undefined) user.statusMessage = statusMessage.trim();
    user.lastActive = Date.now();

    saveDB();
    res.json({ user, message: 'Profile updated' });
  });

  // 5. Get Directory of Registered Users (supports 1000+ active users)
  app.get('/api/users/active', (req: Request, res: Response) => {
    const { q, filter, currentUserId, page = '1', limit = '50' } = req.query;

    const onlineSet = new Set(Array.from(userSockets.keys()));
    let list = Object.values(db.users);

    // Exclude current user from stranger list if requested
    if (currentUserId) {
      list = list.filter((u) => u.id !== currentUserId);
    }

    // Filter by online status if requested
    if (filter === 'online') {
      list = list.filter((u) => onlineSet.has(u.id));
    } else if (filter === 'female') {
      list = list.filter((u) => u.gender.toLowerCase() === 'female');
    } else if (filter === 'male') {
      list = list.filter((u) => u.gender.toLowerCase() === 'male');
    }

    // Search query
    if (q && typeof q === 'string') {
      const term = q.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.displayName.toLowerCase().includes(term) ||
          u.username.toLowerCase().includes(term) ||
          u.city.toLowerCase().includes(term) ||
          u.interests.some((i) => i.toLowerCase().includes(term)) ||
          u.statusMessage.toLowerCase().includes(term)
      );
    }

    // Sort: online users first, then by last active timestamp
    list.sort((a, b) => {
      const aOnline = onlineSet.has(a.id) ? 1 : 0;
      const bOnline = onlineSet.has(b.id) ? 1 : 0;
      if (aOnline !== bOnline) return bOnline - aOnline;
      return b.lastActive - a.lastActive;
    });

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(200, Math.max(10, parseInt(limit as string, 10) || 50));
    const total = list.length;
    const paginated = list.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    const mapped = paginated.map((u) => ({
      ...u,
      isOnline: onlineSet.has(u.id),
    }));

    res.json({
      users: mapped,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      totalOnline: onlineSet.size,
    });
  });

  // 6. Get single user profile
  app.get('/api/users/:id', (req: Request, res: Response) => {
    const user = db.users[req.params.id];
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const isOnline = userSockets.has(user.id);
    res.json({ user: { ...user, isOnline } });
  });

  // 7. Direct Conversations: list
  app.get('/api/conversations', (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: 'userId parameter is required' });
      return;
    }

    const userConvs = Object.values(db.conversations).filter((c) =>
      c.participants.includes(userId)
    );

    const onlineSet = new Set(Array.from(userSockets.keys()));

    const result = userConvs
      .map((c) => {
        const otherId = c.participants[0] === userId ? c.participants[1] : c.participants[0];
        const otherUser = db.users[otherId] || {
          id: otherId,
          displayName: 'User',
          username: 'user',
          avatar: '',
          isOnline: false,
        };

        const msgs = db.messages[c.id] || [];
        const unreadCount = msgs.filter((m) => m.senderId !== userId && !m.read).length;

        return {
          id: c.id,
          participant: {
            ...otherUser,
            isOnline: onlineSet.has(otherId),
          },
          lastMessage: c.lastMessage,
          unreadCount,
          updatedAt: c.updatedAt,
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);

    res.json({ conversations: result });
  });

  // 8. Start or find direct conversation
  app.post('/api/conversations/start', (req: Request, res: Response) => {
    const { userId, targetUserId } = req.body;
    if (!userId || !targetUserId) {
      res.status(400).json({ error: 'userId and targetUserId are required' });
      return;
    }

    if (userId === targetUserId) {
      res.status(400).json({ error: 'Cannot chat with yourself' });
      return;
    }

    // Find existing conversation between these two
    let conv = Object.values(db.conversations).find(
      (c) =>
        (c.participants[0] === userId && c.participants[1] === targetUserId) ||
        (c.participants[0] === targetUserId && c.participants[1] === userId)
    );

    if (!conv) {
      const convId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      conv = {
        id: convId,
        participants: [userId, targetUserId],
        updatedAt: Date.now(),
      };
      db.conversations[convId] = conv;
      db.messages[convId] = [];
      saveDB();
    }

    const otherUser = db.users[targetUserId];
    const isOnline = userSockets.has(targetUserId);

    res.json({
      conversation: {
        id: conv.id,
        participant: {
          ...otherUser,
          isOnline,
        },
        messages: db.messages[conv.id] || [],
      },
    });
  });

  // 9. Get messages of a conversation
  app.get('/api/conversations/:id/messages', (req: Request, res: Response) => {
    const convId = req.params.id;
    const userId = req.query.userId as string;

    const conv = db.conversations[convId];
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const messages = db.messages[convId] || [];

    // Mark as read
    if (userId) {
      let updated = false;
      messages.forEach((m) => {
        if (m.senderId !== userId && !m.read) {
          m.read = true;
          updated = true;
        }
      });
      if (updated) saveDB();
    }

    const otherId = conv.participants[0] === userId ? conv.participants[1] : conv.participants[0];
    const otherUser = db.users[otherId];
    const isOnline = userSockets.has(otherId);

    res.json({
      messages,
      participant: {
        ...otherUser,
        isOnline,
      },
    });
  });

  // 10. Send message in direct conversation
  app.post('/api/conversations/:id/messages', (req: Request, res: Response) => {
    const convId = req.params.id;
    const { senderId, text, mediaUrl, mediaType, audioDuration } = req.body;

    const conv = db.conversations[convId];
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const sender = db.users[senderId];
    if (!sender) {
      res.status(404).json({ error: 'Sender not found' });
      return;
    }

    const newMsg: Message = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      conversationId: convId,
      senderId,
      senderName: sender.displayName,
      senderAvatar: sender.avatar,
      text: (text || '').trim(),
      mediaUrl,
      mediaType,
      audioDuration,
      timestamp: Date.now(),
      read: false,
    };

    if (!db.messages[convId]) {
      db.messages[convId] = [];
    }
    db.messages[convId].push(newMsg);

    conv.lastMessage = newMsg;
    conv.updatedAt = Date.now();
    saveDB();

    // Deliver via WebSocket immediately to both participants
    const recipientId = conv.participants[0] === senderId ? conv.participants[1] : conv.participants[0];
    const outEvent = {
      type: 'direct_message',
      conversationId: convId,
      message: newMsg,
    };

    sendToUser(recipientId, outEvent);
    sendToUser(senderId, outEvent);

    res.status(201).json({ message: newMsg });
  });

  // 11. Random Stranger Matchmaking: Join Queue
  app.post('/api/stranger/find', (req: Request, res: Response) => {
    const { userId, interests } = req.body;
    if (!userId || !db.users[userId]) {
      res.status(400).json({ error: 'Valid userId is required' });
      return;
    }

    // Leave any current stranger session first
    const existingSessId = userStrangerSession.get(userId);
    if (existingSessId && strangerSessions.has(existingSessId)) {
      const sess = strangerSessions.get(existingSessId)!;
      const partnerId = sess.user1Id === userId ? sess.user2Id : sess.user1Id;
      strangerSessions.delete(existingSessId);
      userStrangerSession.delete(sess.user1Id);
      userStrangerSession.delete(sess.user2Id);

      sendToUser(partnerId, {
        type: 'stranger_partner_left',
        sessionId: existingSessId,
        reason: 'Stranger skipped to find another friend.',
      });
    }

    // Remove from queue if already in
    strangerQueue = strangerQueue.filter((item) => item.userId !== userId);

    // Look for a partner in the queue
    const potentialIndex = strangerQueue.findIndex((item) => item.userId !== userId);

    if (potentialIndex !== -1) {
      // We found a real live stranger!
      const partner = strangerQueue.splice(potentialIndex, 1)[0];
      const partnerUser = db.users[partner.userId];
      const meUser = db.users[userId];

      const sessionId = 'str_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const newSession: StrangerSession = {
        id: sessionId,
        user1Id: userId,
        user2Id: partner.userId,
        createdAt: Date.now(),
        messages: [],
      };

      strangerSessions.set(sessionId, newSession);
      userStrangerSession.set(userId, sessionId);
      userStrangerSession.set(partner.userId, sessionId);

      // Notify partner via WebSocket
      sendToUser(partner.userId, {
        type: 'stranger_matched',
        sessionId,
        stranger: {
          id: meUser.id,
          displayName: meUser.displayName,
          username: meUser.username,
          avatar: meUser.avatar,
          bio: meUser.bio,
          city: meUser.city,
          interests: meUser.interests,
          gender: meUser.gender,
        },
      });

      // Respond to requester
      res.json({
        status: 'matched',
        sessionId,
        stranger: {
          id: partnerUser.id,
          displayName: partnerUser.displayName,
          username: partnerUser.username,
          avatar: partnerUser.avatar,
          bio: partnerUser.bio,
          city: partnerUser.city,
          interests: partnerUser.interests,
          gender: partnerUser.gender,
        },
      });
      return;
    }

    // No partner currently waiting in queue -> add to queue
    const userSocketsList = userSockets.get(userId);
    const primaryWs = userSocketsList && userSocketsList.size > 0 ? Array.from(userSocketsList)[0] : null;

    if (primaryWs) {
      strangerQueue.push({ userId, ws: primaryWs, interests });
    }

    res.json({
      status: 'waiting',
      message: 'Looking for an online stranger...',
      queueLength: strangerQueue.length,
    });
  });

  // 12. Leave stranger session or queue
  app.post('/api/stranger/leave', (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    strangerQueue = strangerQueue.filter((item) => item.userId !== userId);

    const sessId = userStrangerSession.get(userId);
    if (sessId && strangerSessions.has(sessId)) {
      const sess = strangerSessions.get(sessId)!;
      const partnerId = sess.user1Id === userId ? sess.user2Id : sess.user1Id;
      strangerSessions.delete(sessId);
      userStrangerSession.delete(sess.user1Id);
      userStrangerSession.delete(sess.user2Id);

      sendToUser(partnerId, {
        type: 'stranger_partner_left',
        sessionId: sessId,
        reason: 'Stranger disconnected.',
      });
    }

    res.json({ status: 'left' });
  });

  // 13. Photo Posts Feed: Get all posts
  app.get('/api/posts', (_req: Request, res: Response) => {
    const list = Object.values(db.posts || {}).sort((a, b) => b.createdAt - a.createdAt);
    res.json({ posts: list });
  });

  // 14. Create a Photo Post
  app.post('/api/posts', (req: Request, res: Response) => {
    const { userId, imageUrl, caption, mood } = req.body;
    if (!userId || !imageUrl) {
      res.status(400).json({ error: 'userId and imageUrl are required' });
      return;
    }

    const user = db.users[userId];
    if (!user) {
      res.status(404).json({ error: 'User profile not found' });
      return;
    }

    const postId = 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newPost: Post = {
      id: postId,
      userId: user.id,
      userName: user.displayName,
      userAvatar: user.avatar,
      userCity: user.city,
      userGender: user.gender,
      imageUrl,
      caption: (caption || '').trim(),
      mood: mood || 'Romantic 💕',
      likes: [],
      comments: [],
      createdAt: Date.now(),
    };

    if (!db.posts) db.posts = {};
    db.posts[postId] = newPost;
    saveDB();

    res.status(201).json({ post: newPost, message: 'Photo posted successfully!' });
  });

  // 15. Toggle Like / Heart on Post
  app.post('/api/posts/:id/like', (req: Request, res: Response) => {
    const postId = req.params.id;
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const post = db.posts?.[postId];
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    const hasLiked = post.likes.includes(userId);
    if (hasLiked) {
      post.likes = post.likes.filter((id) => id !== userId);
    } else {
      post.likes.push(userId);
    }

    saveDB();
    res.json({ post, liked: !hasLiked });
  });

  // 16. Add Comment to Post
  app.post('/api/posts/:id/comment', (req: Request, res: Response) => {
    const postId = req.params.id;
    const { userId, text } = req.body;
    if (!userId || !text?.trim()) {
      res.status(400).json({ error: 'userId and comment text are required' });
      return;
    }

    const post = db.posts?.[postId];
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    const user = db.users[userId];
    const newComment = {
      id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId,
      userName: user ? user.displayName : 'Stranger',
      userAvatar: user ? user.avatar : '',
      text: text.trim(),
      createdAt: Date.now(),
    };

    post.comments.push(newComment);
    saveDB();

    res.status(201).json({ comment: newComment, post });
  });

  // 17. Send Romantic Rose / Love Spark to Stranger
  app.post('/api/users/:id/send-crush', (req: Request, res: Response) => {
    const targetUserId = req.params.id;
    const { senderId, note } = req.body;

    if (!senderId || !targetUserId) {
      res.status(400).json({ error: 'senderId and targetUserId are required' });
      return;
    }

    const sender = db.users[senderId];
    const target = db.users[targetUserId];

    if (!sender || !target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Find or create direct conversation
    let conv = Object.values(db.conversations).find(
      (c) =>
        (c.participants[0] === senderId && c.participants[1] === targetUserId) ||
        (c.participants[0] === targetUserId && c.participants[1] === senderId)
    );

    if (!conv) {
      const convId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      conv = {
        id: convId,
        participants: [senderId, targetUserId],
        updatedAt: Date.now(),
      };
      db.conversations[convId] = conv;
      db.messages[convId] = [];
    }

    const romanticGreeting = note?.trim() || `🌹 Sent you a special Rose & Love Spark! Let's talk? 💕`;
    const newMsg: Message = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      conversationId: conv.id,
      senderId,
      senderName: sender.displayName,
      senderAvatar: sender.avatar,
      text: `🌹 ${romanticGreeting}`,
      timestamp: Date.now(),
      read: false,
    };

    if (!db.messages[conv.id]) db.messages[conv.id] = [];
    db.messages[conv.id].push(newMsg);
    conv.lastMessage = newMsg;
    conv.updatedAt = Date.now();
    saveDB();

    // Deliver via WebSocket immediately
    sendToUser(targetUserId, {
      type: 'direct_message',
      conversationId: conv.id,
      message: newMsg,
    });
    sendToUser(targetUserId, {
      type: 'love_rose_received',
      fromUser: {
        id: sender.id,
        displayName: sender.displayName,
        avatar: sender.avatar,
      },
    });

    res.json({ success: true, conversationId: conv.id, message: newMsg });
  });

  // Mount Vite in development mode
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Production: serve built static files
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Stranger Friends server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
