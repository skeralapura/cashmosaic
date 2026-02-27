-- ============================================================
-- CashMosaic — Global Seed Data
-- Run ONCE after migrations to populate global categories
-- and shared keyword rules visible to all users.
-- ============================================================

-- ──────────────────────────────────────────────
-- Global Categories (19 fixed — no user_id)
-- ──────────────────────────────────────────────
INSERT INTO categories (name, icon, color, is_expense, sort_order) VALUES
  ('Housing',            '🏠', '#EF4444', true,  1),
  ('Groceries',          '🛒', '#F97316', true,  2),
  ('Dining',             '🍽️', '#F59E0B', true,  3),
  ('Travel',             '✈️', '#10B981', true,  4),
  ('Subscriptions',      '📺', '#6366F1', true,  5),
  ('Insurance',          '🛡️', '#8B5CF6', true,  6),
  ('Utilities',          '💡', '#06B6D4', true,  7),
  ('Gas & Fuel',         '⛽', '#84CC16', true,  8),
  ('Shopping',           '🛍️', '#EC4899', true,  9),
  ('Health & Fitness',   '💪', '#14B8A6', true,  10),
  ('Automotive',         '🚗', '#F43F5E', true,  11),
  ('Entertainment',      '🎬', '#A855F7', true,  12),
  ('Education',          '📚', '#3B82F6', true,  13),
  ('Taxes',              '🧾', '#D97706', true,  14),
  ('Legal/Professional', '⚖️', '#64748B', true,  15),
  ('Zelle/Transfers',    '💸', '#0EA5E9', true,  16),
  ('Fees',               '🏦', '#78716C', true,  17),
  ('Income',             '💰', '#22C55E', false, 18),
  ('Uncategorized',      '❓', '#94A3B8', true,  19)
ON CONFLICT (name) DO UPDATE SET
  icon       = EXCLUDED.icon,
  color      = EXCLUDED.color,
  is_expense = EXCLUDED.is_expense,
  sort_order = EXCLUDED.sort_order;

-- ──────────────────────────────────────────────
-- Global Keyword Rules (user_id = NULL)
-- Common merchants that apply to all users.
-- Priority 0 — user rules (priority 5) take precedence.
-- ──────────────────────────────────────────────

-- Housing
INSERT INTO category_rules (user_id, category_id, keyword, priority)
SELECT NULL, id, kw, 0 FROM categories c
CROSS JOIN (VALUES
  ('FREEDOM MORTGAGE'),
  ('AVALON HOA'),
  ('ASSOCIATED ASSET'),
  ('PAYLEASE'),
  ('RENT'),
  ('MORTGAGE')
) AS t(kw) WHERE c.name = 'Housing'
ON CONFLICT DO NOTHING;

-- Groceries
INSERT INTO category_rules (user_id, category_id, keyword, priority)
SELECT NULL, id, kw, 0 FROM categories c
CROSS JOIN (VALUES
  ('COSTCO WHSE'),
  ('KROGER'),
  ('TRADER JOE'),
  ('WHOLE FOODS'),
  ('SAFEWAY'),
  ('ALBERTSONS'),
  ('PUBLIX'),
  ('HEB'),
  ('MEIJER'),
  ('ALDI'),
  ('INSTACART'),
  ('TARGET'),
  ('WALMART GROCERY'),
  ('SPROUTS'),
  ('FRESH MARKET'),
  ('PATEL BROTHER'),
  ('INDIAN GROCERY'),
  ('APNA BAZAAR')
) AS t(kw) WHERE c.name = 'Groceries'
ON CONFLICT DO NOTHING;

-- Dining
INSERT INTO category_rules (user_id, category_id, keyword, priority)
SELECT NULL, id, kw, 0 FROM categories c
CROSS JOIN (VALUES
  ('STARBUCKS'),
  ('PANERA'),
  ('CHIPOTLE'),
  ('MCDONALD'),
  ('CHICK-FIL-A'),
  ('CHICK FIL A'),
  ('SUBWAY'),
  ('TACO BELL'),
  ('BURGER KING'),
  ('WENDY'),
  ('PIZZA HUT'),
  ('DOMINO'),
  ('PAPA JOHN'),
  ('OLIVE GARDEN'),
  ('APPLEBEE'),
  ('IHOP'),
  ('DENNY'),
  ('RED LOBSTER'),
  ('OUTBACK'),
  ('CHEESECAKE FACTORY'),
  ('PANDA EXPRESS'),
  ('FIVE GUYS'),
  ('IN-N-OUT'),
  ('SONIC DRIVE'),
  ('POPEYES'),
  ('SHAKE SHACK'),
  ('WINGSTOP'),
  ('BUFFALO WILD WINGS'),
  ('DUNKIN'),
  ('DUTCH BROS'),
  ('FIRST WATCH'),
  ('UBER *EATS'),
  ('UBER   *EATS'),
  ('DOORDASH'),
  ('GRUBHUB'),
  ('SEAMLESS'),
  ('THAI'),
  ('SUSHI'),
  ('RAMEN'),
  ('NOODLE'),
  ('BISTRO'),
  ('GRILL'),
  ('CAFE'),
  ('COFFEE'),
  ('BAKERY'),
  ('DELI'),
  ('PUNJABI'),
  ('TANDOOR'),
  ('MASALA'),
  ('CURRY LEAF'),
  ('BAWARCHI'),
  ('INDIA GATE'),
  ('MUMBAI'),
  ('HYDERABAD HOUSE'),
  ('NAMASTE'),
  ('CHAI'),
  ('MOON INDIA'),
  ('TIGER LILY'),
  ('MAGGIANO'),
  ('PF CHANG'),
  ('TIM HORTON'),
  ('CHEZ FRANCOIS'),
  ('ECLIPSE COFFEE'),
  ('PROTEIN BAR'),
  ('TOTALWINE')
) AS t(kw) WHERE c.name = 'Dining'
ON CONFLICT DO NOTHING;

-- Travel
INSERT INTO category_rules (user_id, category_id, keyword, priority)
SELECT NULL, id, kw, 0 FROM categories c
CROSS JOIN (VALUES
  ('UNITED AIRLINES'),
  ('AMERICAN AIRLINES'),
  ('DELTA'),
  ('SOUTHWEST'),
  ('JETBLUE'),
  ('SPIRIT AIRLINES'),
  ('FRONTIER AIRLINES'),
  ('KLM'),
  ('LUFTHANSA'),
  ('AIR FRAN'),
  ('BRITISH AIRWAYS'),
  ('TURKISH AIR'),
  ('ETIHAD'),
  ('EMIRATES'),
  ('EXPEDIA'),
  ('KAYAK'),
  ('PRICELINE'),
  ('BOOKING.COM'),
  ('AIRBNB'),
  ('MARRIOTT'),
  ('HILTON'),
  ('HYATT'),
  ('IHG'),
  ('BEST WESTERN'),
  ('HOLIDAY INN'),
  ('HAMPTON INN'),
  ('FAIRMONT'),
  ('HERTZ'),
  ('ENTERPRISE'),
  ('AVIS RENT'),
  ('BUDGET CAR'),
  ('NATIONAL CAR'),
  ('SIXT'),
  ('UBER *TRIP'),
  ('UBER   *TRIP'),
  ('LYFT'),
  ('PTC EZPASS'),
  ('EZPASS'),
  ('INDIANAPOLIS AIRPORT'),
  ('AIRPORT PARKING'),
  ('BANFF GONDOLA')
) AS t(kw) WHERE c.name = 'Travel'
ON CONFLICT DO NOTHING;

-- Subscriptions (higher priority = 5 to override Shopping for digital services)
INSERT INTO category_rules (user_id, category_id, keyword, priority)
SELECT NULL, id, kw, 5 FROM categories c
CROSS JOIN (VALUES
  ('NETFLIX'),
  ('SPOTIFY'),
  ('APPLE.COM/BILL'),
  ('APPLE.COM/SUBSCRI'),
  ('AMAZON PRIME'),
  ('PRIME VIDEO'),
  ('DISNEY PLUS'),
  ('HULU'),
  ('HELP.MAX.COM'),
  ('PEACOCKTV'),
  ('PARAMOUNT+'),
  ('OPENAI'),
  ('CHATGPT'),
  ('GOOGLE *GOOGLE ONE'),
  ('GOOGLE STORAGE'),
  ('DROPBOX'),
  ('ADOBE'),
  ('MICROSOFT 365'),
  ('MICROSOFT *365'),
  ('LINKEDIN PREMIUM'),
  ('YOUTUBE PREMIUM'),
  ('TWITCH'),
  ('PATREON'),
  ('CODEMONKEY'),
  ('ANDY GUITAR'),
  ('SAVVYTRADER'),
  ('HOSTINGER')
) AS t(kw) WHERE c.name = 'Subscriptions'
ON CONFLICT DO NOTHING;

-- Insurance
INSERT INTO category_rules (user_id, category_id, keyword, priority)
SELECT NULL, id, kw, 0 FROM categories c
CROSS JOIN (VALUES
  ('STATE FARM'),
  ('GEICO'),
  ('PROGRESSIVE'),
  ('ALLSTATE'),
  ('USAA INSURANCE'),
  ('NATIONWIDE'),
  ('FARMERS INSURANCE'),
  ('LIBERTY MUTUAL'),
  ('ANTHEM'),
  ('CIGNA'),
  ('AETNA'),
  ('HUMANA'),
  ('UNITED HEALTHCARE')
) AS t(kw) WHERE c.name = 'Insurance'
ON CONFLICT DO NOTHING;

-- Utilities
INSERT INTO category_rules (user_id, category_id, keyword, priority)
SELECT NULL, id, kw, 0 FROM categories c
CROSS JOIN (VALUES
  ('DUKEENERGY'),
  ('DUKE ENERGY'),
  ('VECTREN'),
  ('COMCAST'),
  ('XFINITY'),
  ('AT&T'),
  ('VERIZON'),
  ('T-MOBILE'),
  ('SPECTRUM'),
  ('CITY OF FISHERS'),
  ('CITIZENS ENERGY'),
  ('DOMINION ENERGY'),
  ('CONSUMERS ENERGY'),
  ('EVERSOURCE'),
  ('NATIONAL GRID'),
  ('PG&E'),
  ('SDGE'),
  ('CENTERPOINT ENERGY'),
  ('WATER BILL'),
  ('TRASH')
) AS t(kw) WHERE c.name = 'Utilities'
ON CONFLICT DO NOTHING;

-- Gas & Fuel (priority 5 to override ambiguous matches)
INSERT INTO category_rules (user_id, category_id, keyword, priority)
SELECT NULL, id, kw, 5 FROM categories c
CROSS JOIN (VALUES
  ('COSTCO GAS'),
  ('SHELL'),
  ('EXXON'),
  ('MOBIL'),
  ('CHEVRON'),
  ('SPEEDWAY'),
  ('MARATHON'),
  ('SUNOCO'),
  ('BP '),
  ('CIRCLE K'),
  ('WAWA'),
  ('7-ELEVEN'),
  ('CASEY'),
  ('KWIK TRIP'),
  ('KROGER FUEL'),
  ('LOVES TRAVEL'),
  ('PILOT FLYING J'),
  ('GET GO')
) AS t(kw) WHERE c.name = 'Gas & Fuel'
ON CONFLICT DO NOTHING;

-- Shopping
INSERT INTO category_rules (user_id, category_id, keyword, priority)
SELECT NULL, id, kw, 0 FROM categories c
CROSS JOIN (VALUES
  ('AMAZON.COM'),
  ('AMAZON MKTPL'),
  ('AMZN MKTP'),
  ('WALMART'),
  ('COSTCO.COM'),
  ('BEST BUY'),
  ('HOME DEPOT'),
  ('LOWES'),
  ('IKEA'),
  ('WAYFAIR'),
  ('TARGET'),
  ('DOLLAR TREE'),
  ('DOLLAR GENERAL'),
  ('FIVE BELOW'),
  ('ROSS STORES'),
  ('TJMAXX'),
  ('TJ MAXX'),
  ('MARSHALLS'),
  ('BURLINGTON'),
  ('NORDSTROM'),
  ('MACYS'),
  ('KOHLS'),
  ('JC PENNEY'),
  ('GAP'),
  ('OLD NAVY'),
  ('BANANA REPUBLIC'),
  ('H&M'),
  ('ZARA'),
  ('UNIQLO'),
  ('DSW'),
  ('FOOT LOCKER'),
  ('NIKE'),
  ('ADIDAS'),
  ('SEPHORA'),
  ('ULTA BEAUTY'),
  ('CVS'),
  ('WALGREENS'),
  ('RITE AID'),
  ('BED BATH'),
  ('POTTERY BARN'),
  ('WILLIAMS SONOMA'),
  ('CRATE & BARREL'),
  ('APPLE STORE'),
  ('MICROSOFT STORE'),
  ('SAMSUNG')
) AS t(kw) WHERE c.name = 'Shopping'
ON CONFLICT DO NOTHING;

-- Health & Fitness
INSERT INTO category_rules (user_id, category_id, keyword, priority)
SELECT NULL, id, kw, 0 FROM categories c
CROSS JOIN (VALUES
  ('PLANET FITNESS'),
  ('LIFETIME FITNESS'),
  ('ANYTIME FITNESS'),
  ('LA FITNESS'),
  ('GOLD GYM'),
  ('CRUNCH FITNESS'),
  ('ORANGETHEORY'),
  ('PELOTON'),
  ('CVS PHARMACY'),
  ('WALGREENS PHARM'),
  ('PAYPAL *SQUATS'),
  ('VITAMIN SHOPPE'),
  ('GNC '),
  ('URGENT CARE'),
  ('WALGREENS DRUG')
) AS t(kw) WHERE c.name = 'Health & Fitness'
ON CONFLICT DO NOTHING;

-- Automotive
INSERT INTO category_rules (user_id, category_id, keyword, priority)
SELECT NULL, id, kw, 0 FROM categories c
CROSS JOIN (VALUES
  ('VIOC'),
  ('VALVOLINE'),
  ('JIFFY LUBE'),
  ('FIRESTONE'),
  ('MIDAS'),
  ('PEP BOYS'),
  ('AUTOZONE'),
  ('OREILLY AUTO'),
  ('ADVANCE AUTO'),
  ('NAPA AUTO'),
  ('PRIME CAR WASH'),
  ('MISTER CAR WASH'),
  ('TAKE 5'),
  ('BMV'),
  ('DMV'),
  ('CAR REGISTRATION'),
  ('CAR WASH')
) AS t(kw) WHERE c.name = 'Automotive'
ON CONFLICT DO NOTHING;

-- Entertainment
INSERT INTO category_rules (user_id, category_id, keyword, priority)
SELECT NULL, id, kw, 0 FROM categories c
CROSS JOIN (VALUES
  ('AMC THEATRE'),
  ('AMC DINE-IN'),
  ('REGAL CINEMAS'),
  ('CINEMARK'),
  ('FANDANGO'),
  ('TICKETMASTER'),
  ('EVENTBRITE'),
  ('STUBHUB'),
  ('VIVID SEATS'),
  ('BOWLING'),
  ('MINIATURE GOLF'),
  ('GO KART'),
  ('ESCAPE ROOM'),
  ('K1 SPEED'),
  ('DAVE & BUSTER'),
  ('TOPGOLF'),
  ('ARCADE'),
  ('MEMORIAL COLISEUM'),
  ('MEMORIAL STADIUM')
) AS t(kw) WHERE c.name = 'Entertainment'
ON CONFLICT DO NOTHING;

-- Education (priority 10 to override Shopping)
INSERT INTO category_rules (user_id, category_id, keyword, priority)
SELECT NULL, id, kw, 10 FROM categories c
CROSS JOIN (VALUES
  ('JL MUSIC ACADEMY'),
  ('ANDY GUITAR'),
  ('UDEMY'),
  ('COURSERA'),
  ('SKILLSHARE'),
  ('DUOLINGO'),
  ('KHAN ACADEMY'),
  ('TUTORING'),
  ('CODEMONKEY STUDIOS'),
  ('MUSIC LESSON'),
  ('SWIMMING LESSON'),
  ('DANCE CLASS')
) AS t(kw) WHERE c.name = 'Education'
ON CONFLICT DO NOTHING;

-- Taxes
INSERT INTO category_rules (user_id, category_id, keyword, priority)
SELECT NULL, id, kw, 0 FROM categories c
CROSS JOIN (VALUES
  ('IRS TREAS 310'),
  ('IRS USA TAX'),
  ('INTUIT *TURBOTAX'),
  ('TURBOTAX'),
  ('H&R BLOCK'),
  ('TAXACT'),
  ('STATE TAX'),
  ('HAMILTONCOTREASR'),
  ('PROPERTY TAX'),
  ('TAX PAYMENT')
) AS t(kw) WHERE c.name = 'Taxes'
ON CONFLICT DO NOTHING;

-- Legal/Professional
INSERT INTO category_rules (user_id, category_id, keyword, priority)
SELECT NULL, id, kw, 0 FROM categories c
CROSS JOIN (VALUES
  ('ERICKSON IMMIGRA'),
  ('IMMIGRATION'),
  ('ATTORNEY'),
  ('LAW FIRM'),
  ('NOTARY'),
  ('PAYPAL *COMWIZ'),
  ('LEGAL SHIELD')
) AS t(kw) WHERE c.name = 'Legal/Professional'
ON CONFLICT DO NOTHING;

-- Zelle/Transfers
INSERT INTO category_rules (user_id, category_id, keyword, priority)
SELECT NULL, id, kw, 0 FROM categories c
CROSS JOIN (VALUES
  ('ZELLE PAYMENT TO'),
  ('VENMO'),
  ('CASHAPP'),
  ('PAYPAL TRANSFER'),
  ('WIRE FEE'),
  ('WIRE TRANSFER')
) AS t(kw) WHERE c.name = 'Zelle/Transfers'
ON CONFLICT DO NOTHING;

-- Fees
INSERT INTO category_rules (user_id, category_id, keyword, priority)
SELECT NULL, id, kw, 0 FROM categories c
CROSS JOIN (VALUES
  ('ANNUAL MEMBERSHIP FEE'),
  ('COSTCO ANNUAL MEMBERSHIP'),
  ('ATM FEE'),
  ('OVERDRAFT FEE'),
  ('MONTHLY SERVICE FEE'),
  ('FOREIGN TRANSACTION FEE'),
  ('LATE FEE'),
  ('RETURNED ITEM FEE')
) AS t(kw) WHERE c.name = 'Fees'
ON CONFLICT DO NOTHING;

-- Income (priority 5 to correctly identify income transactions)
INSERT INTO category_rules (user_id, category_id, keyword, priority)
SELECT NULL, id, kw, 5 FROM categories c
CROSS JOIN (VALUES
  ('SFDC'),
  ('100-SFDC'),
  ('PAYROLL'),
  ('DIRECT DEPOSIT'),
  ('TAX REFUND'),
  ('DEPT OF REVENUE'),
  ('FEDERAL REFUND'),
  ('INTEREST PAYMENT'),
  ('INTEREST CREDIT'),
  ('DIVIDEND'),
  ('COSTCO CASH REWARD'),
  ('ZELLE PAYMENT FROM'),
  ('REMOTE ONLINE DEPOSIT'),
  ('CHECK DEPOSIT'),
  ('VENMO FROM')
) AS t(kw) WHERE c.name = 'Income'
ON CONFLICT DO NOTHING;
