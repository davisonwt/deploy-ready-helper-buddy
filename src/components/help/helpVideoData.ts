export interface HelpVideo {
  id: string;
  title: string;
  description: string;
  duration: string;
  type: 'short' | 'medium';
  videoUrl?: string; // placeholder until real URLs added
}

export interface HelpVideoCategory {
  id: string;
  title: string;
  icon: string;
  videos: HelpVideo[];
}

export const helpVideoCategories: HelpVideoCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🌱',
    videos: [
      {
        id: 'gs-1',
        title: 'Welcome to SOW2GROW',
        description: 'An overview of what s2g is — a community-driven, chat-first marketplace for the 364yhvh community.',
        duration: '2 min',
        type: 'medium',
      },
      {
        id: 'gs-2',
        title: 'Setting Up Your Profile',
        description: 'How to complete your sower profile, add your avatar, and personalise your experience.',
        duration: '1 min',
        type: 'short',
      },
      {
        id: 'gs-3',
        title: 'Navigating the Dashboard',
        description: 'Understanding the dashboard layout, themes, bottom bar, and key navigation areas.',
        duration: '2 min',
        type: 'medium',
      },
      {
        id: 'gs-4',
        title: 'Understanding Modes & Themes',
        description: 'How the time-based dashboard themes work and how to switch communication modes.',
        duration: '1 min',
        type: 'short',
      },
    ],
  },
  {
    id: 'orchards-seeds',
    title: 'Orchards & Seeds',
    icon: '🌳',
    videos: [
      {
        id: 'os-1',
        title: 'Creating Your First Orchard',
        description: 'Step-by-step guide to creating your orchard (store) and customising it for your brand.',
        duration: '3 min',
        type: 'medium',
      },
      {
        id: 'os-2',
        title: 'Planting Seeds (Listing Products)',
        description: 'How to plant seeds — add products with images, descriptions, and pricing.',
        duration: '2 min',
        type: 'medium',
      },
      {
        id: 'os-3',
        title: 'Managing Your Orchard',
        description: 'Editing, updating, and maintaining your orchard and its seeds.',
        duration: '2 min',
        type: 'medium',
      },
      {
        id: 'os-4',
        title: 'Orchard Analytics',
        description: 'Understanding your orchard stats, views, and engagement.',
        duration: '1 min',
        type: 'short',
      },
    ],
  },
  {
    id: 'marketplace',
    title: 'Marketplace & Harvesting',
    icon: '🧺',
    videos: [
      {
        id: 'mk-1',
        title: 'Browsing the Marketplace',
        description: 'How to explore orchards, discover seeds, and find what you need.',
        duration: '1 min',
        type: 'short',
      },
      {
        id: 'mk-2',
        title: 'Harvesting Seeds (Making a Bestowal)',
        description: 'How to harvest (acquire) seeds from other sowers through bestowals.',
        duration: '2 min',
        type: 'medium',
      },
      {
        id: 'mk-3',
        title: 'Using the Basket',
        description: 'Adding seeds to your basket and completing the bestowal process.',
        duration: '1 min',
        type: 'short',
      },
      {
        id: 'mk-4',
        title: 'Order Tracking & Deliveries',
        description: 'Tracking your bestowals and coordinating with community drivers.',
        duration: '2 min',
        type: 'medium',
      },
    ],
  },
  {
    id: 'payments-bestowals',
    title: 'Payments & Bestowals',
    icon: '💰',
    videos: [
      {
        id: 'pb-1',
        title: 'Understanding Bestowals',
        description: 'What bestowals are and how the giving-based transaction model works.',
        duration: '2 min',
        type: 'medium',
      },
      {
        id: 'pb-2',
        title: 'Setting Up Your Wallet',
        description: 'Connecting your Solana wallet (Phantom) for USDC transactions.',
        duration: '2 min',
        type: 'medium',
      },
      {
        id: 'pb-3',
        title: 'Tithing & Community Support',
        description: 'How the 10% tithe and 5% admin fee support the community ecosystem.',
        duration: '1 min',
        type: 'short',
      },
      {
        id: 'pb-4',
        title: 'Transaction History',
        description: 'Viewing your bestowal history, receipts, and payment records.',
        duration: '1 min',
        type: 'short',
      },
    ],
  },
  {
    id: 'memry-social',
    title: 'Memry & Social',
    icon: '📸',
    videos: [
      {
        id: 'ms-1',
        title: 'Using the Memry Feed',
        description: 'Browsing, liking, and engaging with community posts in the Memry feed.',
        duration: '1 min',
        type: 'short',
      },
      {
        id: 'ms-2',
        title: 'Posting Seeds, Lives & Adverts',
        description: 'Creating different post types — seeds, live updates, and adverts for your orchard.',
        duration: '3 min',
        type: 'medium',
      },
      {
        id: 'ms-3',
        title: 'Uploading Media & Images',
        description: 'How to upload photos, videos, and other media to your posts.',
        duration: '1 min',
        type: 'short',
      },
      {
        id: 'ms-4',
        title: 'Community Videos',
        description: 'Watching and uploading community videos to share knowledge.',
        duration: '2 min',
        type: 'medium',
      },
    ],
  },
  {
    id: 'chat-communication',
    title: 'Chat & Communication',
    icon: '💬',
    videos: [
      {
        id: 'cc-1',
        title: 'Joining & Using Chat Rooms',
        description: 'How to find, join, and participate in community chat rooms.',
        duration: '2 min',
        type: 'medium',
      },
      {
        id: 'cc-2',
        title: 'Direct Messages & Calls',
        description: 'Sending direct messages and making voice/video calls with other sowers.',
        duration: '2 min',
        type: 'medium',
      },
      {
        id: 'cc-3',
        title: 'Chat File Sharing',
        description: 'Sharing files, images, and documents within chat conversations.',
        duration: '1 min',
        type: 'short',
      },
      {
        id: 'cc-4',
        title: 'Chat-Based Deliveries',
        description: 'How bestowal deliveries are coordinated through the chat system.',
        duration: '2 min',
        type: 'medium',
      },
    ],
  },
  {
    id: 'grove-station',
    title: 'Grove Station Radio',
    icon: '📻',
    videos: [
      {
        id: 'gr-1',
        title: 'Listening to Grove Station',
        description: 'How to tune in, browse channels, and enjoy community radio.',
        duration: '1 min',
        type: 'short',
      },
      {
        id: 'gr-2',
        title: 'Uploading Music & Audio',
        description: 'How sowers can contribute audio content to the radio station.',
        duration: '2 min',
        type: 'medium',
      },
    ],
  },
  {
    id: 'live-classrooms',
    title: 'Live Classrooms',
    icon: '🎓',
    videos: [
      {
        id: 'lc-1',
        title: 'Joining a Live Classroom',
        description: 'How to find and join live teaching sessions hosted by community members.',
        duration: '1 min',
        type: 'short',
      },
      {
        id: 'lc-2',
        title: 'Hosting a Classroom Session',
        description: 'Setting up and running your own live classroom with whiteboards and media.',
        duration: '3 min',
        type: 'medium',
      },
    ],
  },
  {
    id: 'ai-tools',
    title: 'AI Marketing Tools',
    icon: '🤖',
    videos: [
      {
        id: 'ai-1',
        title: 'AI Content Generator',
        description: 'Using the AI assistant to create marketing content for your orchard.',
        duration: '2 min',
        type: 'medium',
      },
      {
        id: 'ai-2',
        title: 'AI Ad Creator',
        description: 'Generating adverts with AI-powered text, images, and voiceovers.',
        duration: '3 min',
        type: 'medium',
      },
    ],
  },
  {
    id: 'community-services',
    title: 'Community Services',
    icon: '🚗',
    videos: [
      {
        id: 'cs-1',
        title: 'Community Drivers',
        description: 'How community drivers help deliver bestowals and how to sign up as a driver.',
        duration: '2 min',
        type: 'medium',
      },
      {
        id: 'cs-2',
        title: 'Whisperers (Influencers)',
        description: 'Becoming a whisperer and promoting orchards within the community.',
        duration: '2 min',
        type: 'medium',
      },
      {
        id: 'cs-3',
        title: 'Ambassador Programme',
        description: 'How to apply and participate in the s2g ambassador programme.',
        duration: '1 min',
        type: 'short',
      },
    ],
  },
  {
    id: 'circles-community',
    title: 'Circles & Community',
    icon: '⭕',
    videos: [
      {
        id: 'ci-1',
        title: 'Understanding Circles',
        description: 'What circles are and how they organise the community into groups.',
        duration: '1 min',
        type: 'short',
      },
      {
        id: 'ci-2',
        title: 'Community Posts & Discussions',
        description: 'Posting, replying, and voting on community discussions within circles.',
        duration: '2 min',
        type: 'medium',
      },
    ],
  },
  {
    id: 'calendar-faith',
    title: '364yhvh Calendar & Faith',
    icon: '📅',
    videos: [
      {
        id: 'cf-1',
        title: 'The 364yhvh Calendar',
        description: 'Understanding the calendar system and how it integrates with the platform.',
        duration: '2 min',
        type: 'medium',
      },
      {
        id: 'cf-2',
        title: 'Birthdays & Feast Days',
        description: 'Tracking birthdays and community feast days on the calendar.',
        duration: '1 min',
        type: 'short',
      },
    ],
  },
  {
    id: 'library-books',
    title: 'Library & Books',
    icon: '📚',
    videos: [
      {
        id: 'lb-1',
        title: 'Browsing the Library',
        description: 'Exploring sower-published books and community resources.',
        duration: '1 min',
        type: 'short',
      },
      {
        id: 'lb-2',
        title: 'Publishing a Book',
        description: 'How to create, upload, and list your book for the community.',
        duration: '3 min',
        type: 'medium',
      },
    ],
  },
  {
    id: 'stats-progress',
    title: 'Stats & Progress',
    icon: '📊',
    videos: [
      {
        id: 'sp-1',
        title: 'Viewing Your Stats',
        description: 'Understanding your activity stats, XP, achievements, and mastery level.',
        duration: '1 min',
        type: 'short',
      },
      {
        id: 'sp-2',
        title: 'Gamification & Achievements',
        description: 'How the XP system, badges, and mastery progression work.',
        duration: '2 min',
        type: 'medium',
      },
    ],
  },
  {
    id: 'settings-account',
    title: 'Settings & Account',
    icon: '⚙️',
    videos: [
      {
        id: 'sa-1',
        title: 'Account Settings',
        description: 'Managing your account, notifications, privacy, and preferences.',
        duration: '1 min',
        type: 'short',
      },
      {
        id: 'sa-2',
        title: 'Affiliate & Referral Programme',
        description: 'How to refer others and earn through the affiliate system.',
        duration: '2 min',
        type: 'medium',
      },
    ],
  },
];
