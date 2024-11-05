// types.ts

export interface Farmer {
    id: string;
    name: string;
    email: string;
    role: string;
    cropExpertise?: string; // Optional for farmers
    createdAt: string; // Store as a string or Date
  }
  
  export interface Post {
    id: string;
    content: string;
    imageUri?: string; // Optional, as posts may not have images
    userId: string;
    createdAt: string; // Store as a string or Date
    userName: string;
  }
  