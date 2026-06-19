
-- companion_planting reference table
CREATE TABLE public.companion_planting (
  plant TEXT PRIMARY KEY,
  companions TEXT[] NOT NULL DEFAULT '{}',
  avoid TEXT[] NOT NULL DEFAULT '{}',
  benefits TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.companion_planting TO anon, authenticated;
GRANT ALL ON public.companion_planting TO service_role;
ALTER TABLE public.companion_planting ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companion planting is public" ON public.companion_planting FOR SELECT USING (true);

-- moon_phase_gardening reference table
CREATE TABLE public.moon_phase_gardening (
  phase TEXT PRIMARY KEY,
  what_to_do TEXT NOT NULL,
  what_to_avoid TEXT,
  best_for TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.moon_phase_gardening TO anon, authenticated;
GRANT ALL ON public.moon_phase_gardening TO service_role;
ALTER TABLE public.moon_phase_gardening ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Moon phase gardening is public" ON public.moon_phase_gardening FOR SELECT USING (true);

-- Seed companion planting
INSERT INTO public.companion_planting (plant, companions, avoid, benefits) VALUES
('Asparagus', ARRAY['Tomato','Parsley','Basil'], ARRAY[]::text[], 'French marigold deters beetles; comfrey adds nitrogen when planted nearby.'),
('Beans', ARRAY['Beetroot','Cabbage','Celery','Carrot','Cucumber','Corn','Squash','Peas','Potatoes','Radish','Strawberry'], ARRAY['Garlic','Shallots','Onions'], 'Beans fix nitrogen into the soil; nasturtium and rosemary deter beetles; marigolds protect against Mexican bean beetles.'),
('Beetroot', ARRAY['Onion','Lettuce','Cabbage family','Beans'], ARRAY['Pole beans'], 'Pairs well with the cabbage family; pole beans hinder beet growth.'),
('Cabbage Family', ARRAY['Cucumber','Lettuce','Potato','Onion','Spinach','Celery'], ARRAY['Tomato','Strawberry'], 'Chamomile and garlic improve growth; marigolds and nasturtiums attract pests away from the crop.'),
('Carrot', ARRAY['Beans','Peas','Onions','Lettuce','Tomato','Radish','Chives'], ARRAY['Dill'], 'Chives and onions enhance flavour and distract carrot flies; dill stunts carrot growth.'),
('Celery', ARRAY['Beans','Tomato','Cabbage family'], ARRAY[]::text[], 'Nasturtium, chives, and garlic repel aphids.'),
('Corn', ARRAY['Potato','Pumpkin','Squash','Cucumber','Beans'], ARRAY['Tomato'], 'French marigold deters beetles; corn and tomato share the same fruit-worm pest.'),
('Cucumber', ARRAY['Cabbage','Beans','Radish','Tomato'], ARRAY['Sage'], 'Marigold and nasturtium draw pests away; sage is harmful when planted close to cucumber.'),
('Lettuce', ARRAY['Cabbage','Carrot','Beet','Onion','Strawberry'], ARRAY[]::text[], 'Chives and garlic deter aphids.'),
('Melon', ARRAY['Pumpkin','Radish','Corn','Squash'], ARRAY[]::text[], 'Marigold and nasturtium provide pest protection.'),
('Onion', ARRAY['Cabbage family','Beet','Tomato','Pepper','Strawberry','Peas','Chard','Carrot'], ARRAY['Beans','Peas'], 'Chamomile improves onion growth; onions stunt the growth of beans and peas.'),
('Parsley', ARRAY['Asparagus','Tomato','Corn'], ARRAY[]::text[], 'Encourages tomato and asparagus vigour.'),
('Peas', ARRAY['Beans','Carrot','Corn','Radish','Mint'], ARRAY['Onions','Garlic'], 'Chives and onions deter aphids; mint enhances pea growth.'),
('Peppers', ARRAY['Tomato','Eggplant','Carrot','Onion','Basil'], ARRAY[]::text[], 'Basil supports growth and repels pests.'),
('Potato', ARRAY['Beans','Cabbage','Squash','Peas','Horseradish'], ARRAY['Tomato'], 'Marigold and horseradish provide insect protection; potato and tomato share blight susceptibility.'),
('Pumpkin', ARRAY['Melon','Eggplant','Corn'], ARRAY[]::text[], 'Oregano and marigold deter pests.'),
('Radish', ARRAY['Carrot','Cucumber','Beans','Peas','Melon'], ARRAY['Hyssop'], 'Nasturtium improves radish growth.'),
('Squash', ARRAY['Melon','Pumpkin','Tomato','Corn'], ARRAY[]::text[], 'Nasturtium, marigold, and oregano protect against pests.'),
('Strawberry', ARRAY['Beans','Lettuce','Onion','Spinach','Borage','Thyme'], ARRAY['Cabbage family'], 'Thyme deters worms; borage strengthens disease resistance.'),
('Tomato', ARRAY['Celery','Cucumber','Asparagus','Parsley','Pepper','Carrot','Basil','Mint'], ARRAY['Corn','Potato','Cabbage'], 'Basil and dwarf marigold repel flies and aphids; mint improves overall health and flavour; avoid corn (shared pest) and potato (shared blight).');

-- Seed moon-phase gardening guidance (8 lunar phases used by sacred_moon_phases.phase)
INSERT INTO public.moon_phase_gardening (phase, what_to_do, what_to_avoid, best_for) VALUES
('New Moon',
 'A resting, planning day. Prepare beds, plan layouts, sharpen tools, and start soaking seeds. Energy is drawn down into the roots — light feeding with compost tea is good.',
 'Sowing or transplanting — germination is slow during the dark of the moon.',
 'Composting, soil preparation, planning, soaking seed.'),
('Waxing Crescent',
 'Sap rises. Sow leafy annuals that produce seed outside the fruit — lettuce, spinach, cabbage, kale, celery, broccoli, parsley, chard. Water generously.',
 'Pruning or harvesting for storage — moisture content is rising and produce will spoil.',
 'Sowing leaf crops, transplanting seedlings, grafting.'),
('First Quarter',
 'Best window for sowing fruiting annuals that bear seed inside — tomatoes, beans, peas, peppers, squash, cucumber, melon, pumpkin. Strong leaf and balanced fruit energy.',
 'Heavy pruning, root division.',
 'Sowing fruit and seed crops, transplanting tomatoes, peppers and beans.'),
('Waxing Gibbous',
 'Slow growth window just before Full Moon. Finish sowing fruiting crops, mulch heavily, feed with compost or liquid seaweed. Excellent for transplanting strong seedlings.',
 'Pruning — wounds bleed sap heavily.',
 'Mulching, feeding, transplanting, final fruit-crop sowing.'),
('Full Moon',
 'Maximum sap and moisture. Harvest leafy greens and culinary herbs now for best flavour. Gather seed from herbs and flowers. A blessed day for sowing root crops as the energy begins to turn downward.',
 'Hard pruning — sap loss is greatest at Full Moon.',
 'Harvesting leaves & herbs, sowing root crops, fertilising fruit trees.'),
('Waning Gibbous',
 'Energy moves downward into the roots. Best time to sow root crops — carrots, beetroot, onions, garlic, radish, turnip, sweet potato — and to divide perennial roots. Good for transplanting bulbs.',
 'Sowing leafy or fruiting annuals — they will bolt or run to seed.',
 'Root crops, bulbs, perennials, root division, planting fruit trees.'),
('Last Quarter',
 'A resting & cleansing period. Excellent for weeding, pest control, pruning, mowing, and turning the compost heap. Sap is low so cuts heal cleanly. Good day to harvest produce for storage (low water content).',
 'Sowing — germination is poor.',
 'Pruning, weeding, pest control, harvesting for storage, turning compost.'),
('Waning Crescent',
 'The darkest, quietest part of the lunar cycle. Rest the soil and the gardener. Spread compost, prepare beds, mulch. A traditional time for cleansing rituals and seed selection for the next cycle.',
 'Sowing or transplanting — life force is at its lowest.',
 'Composting, mulching, soil preparation, tool care, seed selection.');
