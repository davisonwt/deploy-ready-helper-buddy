// Learn & Share video catalog — extracted from LearnSharePage.jsx so the
// public single-video route (LearnShareVideoPage) can look up a video by id
// without duplicating this list. Keep in sync in one place only.

import becomeASowerVideo from '../assets/explainers/become-a-sower.mp4';
import becomeAWanderingHeartVideo from '../assets/explainers/become-a-wandering-heart.mp4';

// Banner videos (correct mapping per user instructions)
import communityOrchardVideo from '../assets/banners/banner-01-community-orchard.mp4';
import productionOrchardVideo from '../assets/banners/banner-02-production-orchard.mp4';
import singleSeedVideo from '../assets/banners/banner-03-single-seed.mp4';

import becomeAWanderingWheelVideo from '../assets/banners/banner-04-wandering-wheel.mp4';
import bookAWanderingWheelVideo from '../assets/banners/banner-04-wandering-wheel-book.mp4';

import connectWithAHandVideo from '../assets/banners/banner-05-wandering-hand.mp4';
import becomeAWanderingHandVideo from '../assets/banners/banner-05b-wandering-hand-become.mp4';
import bestowingVideo from '../assets/banners/banner-17-bestowing.mp4';

import becomeAWhispererVideo from '../assets/banners/banner-06-wandering-whisperer.mp4';
import bookAWhispererVideo from '../assets/banners/banner-06-wandering-whisperer-book.mp4';

import becomeAWanderingPillowVideo from '../assets/banners/banner-07-wandering-pillow.mp4';
import reserveAStayVideo from '../assets/banners/banner-07-wandering-pillow-book.mp4';

import becomeAWanderingFieldVideo from '../assets/banners/banner-08-wandering-field.mp4';
import orderFromTheFieldVideo from '../assets/banners/banner-08-wandering-field-book.mp4';

import becomeAHearthCreatorVideo from '../assets/banners/banner-09-wandering-hearth.mp4';
import bestowAHearthSeedVideo from '../assets/banners/banner-09-wandering-hearth-book.mp4';

import becomeAWanderingForgeVideo from '../assets/banners/banner-10-wandering-forge.mp4';
import commissionAForgeVideo from '../assets/banners/banner-10-wandering-forge-book.mp4';

import classroomVideo from '../assets/banners/banner-11-classroom.mp4';
import skilldropVideo from '../assets/banners/banner-12-skilldrop.mp4';
import trainingVideo from '../assets/banners/banner-13-training.mp4';
import radioVideo from '../assets/banners/banner-14-radio.mp4';
import oneOnOneVideo from '../assets/banners/banner-15-one-on-one.mp4';
import groupChatVideo from '../assets/banners/banner-16-group-chat.mp4';

// Learn & Share batch (13 new explainers, 5-image slideshow + alloy VO)
import findAHeartVideo from '../assets/explainers/learn-share/find-a-wandering-heart.mp4';
import becomeAWhispererExplainerVideo from '../assets/explainers/learn-share/become-a-whisperer.mp4';
import findAWhispererVideo from '../assets/explainers/learn-share/find-a-whisperer.mp4';
// what-is-sow2grow local explainer replaced by cinematic marketing edit (see marketing imports below)
import theReferralSystemVideo from '../assets/explainers/learn-share/the-referral-system.mp4';
import browseCommunityOrchardsVideo from '../assets/explainers/learn-share/browse-community-orchards.mp4';
import theGroveStationVideo from '../assets/explainers/learn-share/the-grove-station.mp4';
import myGardenGuideVideo from '../assets/explainers/learn-share/my-garden-guide.mp4';
import goLiveOnASeedVideo from '../assets/explainers/learn-share/go-live-on-a-seed.mp4';
import theWanderingDirectoryVideo from '../assets/explainers/learn-share/the-wandering-directory.mp4';
import calendar364yhvhVideo from '../assets/explainers/learn-share/calendar-364yhvh.mp4';
import letItRainVideo from '../assets/explainers/learn-share/let-it-rain.mp4';
import theMusicLibraryVideo from '../assets/explainers/learn-share/the-music-library.mp4';
import s2gWalletSetupVideo from '../assets/explainers/learn-share/s2g-wallet-setup.mp4';

// Marketing hero videos (Remotion-rendered, CDN-hosted)
import whatIsSow2GrowMarketingAsset from '../assets/marketing/s2g-what-is-sow2grow.mp4.asset.json';
import tribeEconomyMarketingAsset from '../assets/marketing/s2g-tribe-economy.mp4.asset.json';
const whatIsSow2GrowMarketingVideo = whatIsSow2GrowMarketingAsset.url;
const tribeEconomyMarketingVideo = tribeEconomyMarketingAsset.url;

export interface LearnVideo {
  id: number;
  role: string;
  title: string;
  desc: string;
  color: string;
  emoji: string;
  url: string | null;
}

export const VIDEOS: LearnVideo[] = [
  { id: 1,  role: 'Wheel',     title: 'Become a Wandering Wheel',   desc: 'How to register as a driver & transport provider', color: '#06b6d4', emoji: '🚗', url: becomeAWanderingWheelVideo },
  { id: 2,  role: 'Wheel',     title: 'Book a Wandering Wheel',     desc: 'How to find and book a driver near you',           color: '#06b6d4', emoji: '🚗', url: bookAWanderingWheelVideo },
  { id: 3,  role: 'Hand',      title: 'Become a Wandering Hand',    desc: 'How to register your skilled service',             color: '#22c55e', emoji: '🤲', url: becomeAWanderingHandVideo },
  { id: 4,  role: 'Hand',      title: 'Connect with a Hand',        desc: 'How to find and hire skilled tribe members',       color: '#22c55e', emoji: '🤲', url: connectWithAHandVideo },
  { id: 5,  role: 'Whisperer', title: 'Become a Whisperer',         desc: 'How to earn by referring seeds & orchards',        color: '#a855f7', emoji: '🌬️', url: becomeAWhispererVideo },
  { id: 6,  role: 'Whisperer', title: 'Connect with a Whisperer',   desc: 'How to book / connect with a wandering whisperer', color: '#a855f7', emoji: '🌬️', url: bookAWhispererVideo },
  { id: 7,  role: 'Pillow',    title: 'Become a Wandering Pillow',  desc: 'How to list your accommodation',                   color: '#ec4899', emoji: '🛏️', url: becomeAWanderingPillowVideo },
  { id: 8,  role: 'Pillow',    title: 'Reserve a Stay',             desc: 'How to book a Wandering Pillow',                   color: '#ec4899', emoji: '🛏️', url: reserveAStayVideo },
  { id: 9,  role: 'Field',     title: 'Become a Wandering Field',   desc: 'How to list your farm produce',                    color: '#eab308', emoji: '🌾', url: becomeAWanderingFieldVideo },
  { id: 10, role: 'Field',     title: 'Order from the Field',       desc: 'How to buy from farmers in your tribe',            color: '#eab308', emoji: '🌾', url: orderFromTheFieldVideo },
  { id: 11, role: 'Hearth',    title: 'Become a Hearth Creator',    desc: 'How to list your home-made goods — crafts, baked goods, preserves & more', color: '#f97316', emoji: '🔥', url: becomeAHearthCreatorVideo },
  { id: 12, role: 'Hearth',    title: 'Bestow a Hearth Seed',       desc: 'How to support a creator through bestowal',        color: '#f97316', emoji: '🔥', url: bestowAHearthSeedVideo },
  { id: 13, role: 'Forge',     title: 'Become a Wandering Forge',   desc: 'How to list your craft & manufacturing skills',    color: '#64748b', emoji: '⚒️', url: becomeAWanderingForgeVideo },
  { id: 14, role: 'Forge',     title: 'Commission a Forge',         desc: 'How to order custom made items',                   color: '#64748b', emoji: '⚒️', url: commissionAForgeVideo },
  { id: 15, role: 'Heart',     title: 'Become a Wandering Heart',   desc: 'Set up your Tribal Hearts profile so singles in the tribe can find and connect with you', color: '#10b981', emoji: '💚', url: becomeAWanderingHeartVideo },
  { id: 16, role: 'Heart',     title: 'Find a Wandering Heart',     desc: 'Singles connect securely via ChatApp text, voice, or video — no email or phone shared', color: '#10b981', emoji: '💚', url: findAHeartVideo },
  { id: 17, role: 'Whisperer', title: 'Become a Whisperer (Marketer)', desc: 'List as an online marketer / creator and earn % on seeds you take viral', color: '#a855f7', emoji: '🌬️', url: becomeAWhispererExplainerVideo },
  { id: 18, role: 'Whisperer', title: 'Find a Whisperer',             desc: 'Browse the Whisperers feed and partner up via ChatApp',           color: '#a855f7', emoji: '🌬️', url: findAWhispererVideo },
  { id: 19, role: 'Platform',  title: 'What is Sow2Grow',           desc: 'The full platform explained (cinematic marketing edit)', color: '#0ea5e9', emoji: '🏛️', url: whatIsSow2GrowMarketingVideo },
  { id: 41, role: 'Field',     title: 'The Tribe Economy in 60 Seconds', desc: 'How sowers, bestowers & whisperers create income together — zero middlemen', color: '#eab308', emoji: '🌾', url: tribeEconomyMarketingVideo },
  { id: 20, role: 'Platform',  title: 'How Bestowing Works',        desc: 'Understanding pockets & bestowals',                color: '#0ea5e9', emoji: '🏛️', url: bestowingVideo },
  { id: 21, role: 'Platform',  title: 'Sow a Single Seed',          desc: 'Step by step seed creation guide',                 color: '#0ea5e9', emoji: '🏛️', url: singleSeedVideo },
  { id: 22, role: 'Platform',  title: 'Community Orchard Explained',desc: 'How tribe needs become community orchards',        color: '#0ea5e9', emoji: '🏛️', url: communityOrchardVideo },
  { id: 23, role: 'Platform',  title: 'Production Orchard Explained',desc:'How to fund a product into existence',             color: '#0ea5e9', emoji: '🏛️', url: productionOrchardVideo },
  { id: 24, role: 'Platform',  title: 'The Referral System',        desc: 'How to earn 1% forever through your tribe',        color: '#0ea5e9', emoji: '🏛️', url: theReferralSystemVideo },
  { id: 35, role: 'Platform',  title: 'Host a Live Classroom',      desc: 'How to host a live classroom session',             color: '#0ea5e9', emoji: '🏛️', url: classroomVideo },
  { id: 36, role: 'Platform',  title: 'Open a Skilldrop Room',      desc: 'How to open a skilldrop room',                     color: '#0ea5e9', emoji: '🏛️', url: skilldropVideo },
  { id: 37, role: 'Platform',  title: 'Host a Training Session',    desc: 'How to host a live training session',              color: '#0ea5e9', emoji: '🏛️', url: trainingVideo },
  { id: 38, role: 'Platform',  title: 'Host Your Own Radio Show',   desc: 'How to start your own radio show',                 color: '#0ea5e9', emoji: '🏛️', url: radioVideo },
  { id: 39, role: 'Platform',  title: 'Start a 1-on-1 Chat',        desc: 'How to start a private 1-on-1 chat',               color: '#0ea5e9', emoji: '🏛️', url: oneOnOneVideo },
  { id: 40, role: 'Platform',  title: 'Start an S2G Group Chat',    desc: 'How to start an S2G group call',                   color: '#0ea5e9', emoji: '🏛️', url: groupChatVideo },
  { id: 25, role: 'Orchard',   title: 'Browse Community Orchards',  desc: 'How to find and bestow into orchards',             color: '#16a34a', emoji: '🌳', url: browseCommunityOrchardsVideo },
  { id: 26, role: 'Orchard',   title: 'The Grove Station',          desc: 'How to use the 24hr community radio',              color: '#16a34a', emoji: '🌳', url: theGroveStationVideo },
  { id: 27, role: 'Orchard',   title: 'My Garden Guide',            desc: 'How to manage your seeds & orchards',              color: '#16a34a', emoji: '🌳', url: myGardenGuideVideo },
  { id: 28, role: 'Orchard',   title: 'Go Live on a Seed',          desc: 'How to host a live session for a seed',            color: '#16a34a', emoji: '🌳', url: goLiveOnASeedVideo },
  { id: 29, role: 'Orchard',   title: 'The Wandering Directory',    desc: 'How to find tribe members by role',                color: '#16a34a', emoji: '🌳', url: theWanderingDirectoryVideo },
  { id: 30, role: 'Orchard',   title: '364yhvh Calendar',           desc: 'How the sacred calendar works in S2G',             color: '#16a34a', emoji: '🌳', url: calendar364yhvhVideo },
  { id: 31, role: 'Orchard',   title: 'Let It Rain',                desc: 'How to bestow blessings to the tribe',             color: '#16a34a', emoji: '🌳', url: letItRainVideo },
  { id: 32, role: 'Orchard',   title: 'The Music Library',          desc: 'How to upload and share your music',               color: '#16a34a', emoji: '🌳', url: theMusicLibraryVideo },
  { id: 33, role: 'Orchard',   title: 'S2G Wallet Setup',           desc: 'How to set up USDC payments',                      color: '#16a34a', emoji: '🌳', url: s2gWalletSetupVideo },
  { id: 34, role: 'Orchard',   title: 'Become a Sower & Grower',    desc: 'The complete S2G onboarding guide',                color: '#16a34a', emoji: '🌳', url: becomeASowerVideo },
];

export function findLearnVideo(id: string | number): LearnVideo | undefined {
  const n = typeof id === 'string' ? Number(id) : id;
  return VIDEOS.find((v) => v.id === n);
}
