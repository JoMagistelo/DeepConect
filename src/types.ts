export interface User {
  id: string;
  displayName: string;
  birthdate: string;
  gender: string;
  seeking: string[];
  bio?: string;
  photos: string[];
  location?: {
    city: string;
    lat: number;
    lng: number;
  };
  profileAuthority: number;
  reputationWeight: number;
  interestTags: string[];
  relationshipGoal: string;
  zodiacSign?: string;
  datingPsychology: string;
  habits: {
    drinks?: string;
    smokes?: string;
    children?: string;
  };
  onboardingCompleted: boolean;
  uiStyle?: 'holographic' | 'blackout' | 'red';
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
}

export interface Swipe {
  id: string;
  swiperId: string;
  swipedId: string;
  direction: 'L' | 'R' | 'S';
  matchScore: number;
  createdAt: string;
}

export interface Match {
  id: string;
  userIds: string[];
  finalScore: number;
  isSoulMatch: boolean;
  createdAt: string;
  lastMessage?: string;
  lastMessageAt?: string;
  otherUser?: User; // Joined for UI
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  contentType: 'text' | 'image';
  createdAt: string;
  read: boolean;
}
