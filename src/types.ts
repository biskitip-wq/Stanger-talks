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
  isOnline?: boolean;
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

export interface ConversationSummary {
  id: string;
  participant: User;
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: number;
}

export interface StrangerPartner {
  id: string;
  displayName: string;
  username: string;
  avatar: string;
  bio: string;
  city: string;
  interests: string[];
  gender: string;
}

export interface StrangerMessage {
  id: string;
  senderId: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio';
  timestamp: number;
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

export interface AppStats {
  totalRegisteredUsers: number;
  onlineUsers: number;
  totalMessages: number;
  activeStrangerChats: number;
  queueLength: number;
  totalPosts?: number;
}
