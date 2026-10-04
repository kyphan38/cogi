/**
 * Calibration question bank (PLAN-psychology.md P2). Answers come from this file, never
 * from the AI. Prefer facts that do not change (history, geography, science) and exact
 * calculations; a number that changes says its year. Each item names its source so
 * the owner can spot-check it.
 */

export const CALIBRATION_CATEGORIES = ["Science", "Geography", "History", "Money & numbers", "Vietnam"] as const;
export type CalibrationCategory = (typeof CALIBRATION_CATEGORIES)[number];

/** Pick one of two answers, then say how sure you are (50-100%). */
export interface BinaryBankItem {
  id: string;
  kind: "binary";
  category: CalibrationCategory;
  question: string;
  options: [string, string];
  answerIndex: 0 | 1;
  /** One or two sentences with the facts behind the answer. */
  explanation: string;
  source: string;
}

/** Give a low and a high number you are 80% (or 90%) sure the answer is between. */
export interface IntervalBankItem {
  id: string;
  kind: "interval";
  category: CalibrationCategory;
  question: string;
  /** Always positive, so "how many times wider" is meaningful. */
  answer: number;
  unit: string;
  explanation: string;
  source: string;
}

export type CalibrationBankItem = BinaryBankItem | IntervalBankItem;

const BRITANNICA = "Encyclopaedia Britannica";
const EXACT = "Exact calculation";

const b = (
  id: string,
  category: CalibrationCategory,
  question: string,
  options: [string, string],
  answerIndex: 0 | 1,
  explanation: string,
  source: string,
): BinaryBankItem => ({ id, kind: "binary", category, question, options, answerIndex, explanation, source });

const n = (
  id: string,
  category: CalibrationCategory,
  question: string,
  answer: number,
  unit: string,
  explanation: string,
  source: string,
): IntervalBankItem => ({ id, kind: "interval", category, question, answer, unit, explanation, source });

export const CALIBRATION_BANK: CalibrationBankItem[] = [
  // Science
  b("sci-b1", "Science", "Which is heavier: one liter of water or one liter of olive oil?", ["Water", "Olive oil"], 0, "Olive oil is about 0.91 kg per liter; water is about 1 kg. That is why oil floats.", BRITANNICA),
  b("sci-b2", "Science", "Which is hotter: the surface of the Sun or a lightning bolt?", ["The Sun's surface", "A lightning bolt"], 1, "The Sun's surface is about 5,500 °C. A lightning bolt can heat the air to about 30,000 °C.", "NOAA National Weather Service"),
  b("sci-b3", "Science", "Which has more chromosomes in each cell: a human or a potato?", ["A human", "A potato"], 1, "Humans have 46 chromosomes. The common potato has 48.", BRITANNICA),
  b("sci-b4", "Science", "Which is longer: one day on Venus (one turn on its axis) or one year on Venus (one trip around the Sun)?", ["One day", "One year"], 0, "Venus turns once in about 243 Earth days, but goes around the Sun in about 225 Earth days.", "NASA"),
  b("sci-b5", "Science", "Which is usually bigger: a virus or a bacterium?", ["A virus", "A bacterium"], 1, "Most bacteria are about 1-5 micrometers long. Most viruses are 20-300 nanometers, many times smaller.", BRITANNICA),
  b("sci-b6", "Science", "Where does water boil at a lower temperature: at sea level or on top of Mount Everest?", ["At sea level", "On Mount Everest"], 1, "Lower air pressure lowers the boiling point. On Everest, water boils at about 70 °C.", BRITANNICA),
  b("sci-b7", "Science", "Which has more neurons: a human brain or an octopus?", ["A human brain", "An octopus"], 0, "A human brain has about 86 billion neurons. An octopus has about 500 million.", "Herculano-Houzel (2009); Hochner (2012)"),
  b("sci-b8", "Science", "Which is denser: ice or liquid water?", ["Ice", "Liquid water"], 1, "Ice is about 9% less dense than liquid water, so it floats.", BRITANNICA),
  b("sci-b9", "Science", "Which is wider: the Moon or Australia (east to west)?", ["The Moon", "Australia"], 1, "The Moon is about 3,474 km across. Australia is about 4,000 km from east to west.", "NASA; Geoscience Australia"),
  b("sci-b10", "Science", "Which appeared on Earth first: sharks or trees?", ["Sharks", "Trees"], 0, "The first sharks appeared about 450 million years ago. The first trees appeared about 385 million years ago.", "Natural History Museum, London"),
  b("sci-b11", "Science", "Which planet is closer to the Sun: Venus or Mars?", ["Venus", "Mars"], 0, "Venus is the second planet from the Sun. Mars is the fourth.", "NASA"),
  b("sci-b12", "Science", "Which travels faster through air: sound or a passenger jet at cruising speed?", ["Sound", "A passenger jet"], 0, "Sound travels about 1,235 km/h at 20 °C. A passenger jet cruises at about 900 km/h.", BRITANNICA),
  b("sci-b13", "Science", "Which has more bones: an adult human or a newborn baby?", ["An adult", "A newborn baby"], 1, "A newborn has about 270-300 bones. Many fuse together, so an adult has 206.", BRITANNICA),
  b("sci-b14", "Science", "Which is longer: the time light takes to reach us from the Sun, or 5 minutes?", ["Light from the Sun", "5 minutes"], 0, "Sunlight takes about 8 minutes and 20 seconds to reach Earth.", "NASA"),
  n("sci-n1", "Science", "How fast does light travel in a vacuum, in kilometers per second?", 299792, "km/s", "Light travels 299,792 km every second.", "NIST"),
  n("sci-n2", "Science", "What is the average distance from the Earth to the Moon, in kilometers?", 384400, "km", "The average distance is about 384,400 km.", "NASA"),
  n("sci-n3", "Science", "How many bones does an adult human have?", 206, "bones", "An adult skeleton usually has 206 bones.", BRITANNICA),
  n("sci-n4", "Science", "How many chemical elements are in the periodic table today?", 118, "elements", "118 elements have been named, up to oganesson.", "IUPAC"),
  n("sci-n5", "Science", "What is the diameter of the Earth, in kilometers?", 12742, "km", "The Earth's mean diameter is about 12,742 km.", "NASA"),
  n("sci-n6", "Science", "How fast does sound travel in air at 20 °C, in meters per second?", 343, "m/s", "Sound travels about 343 m every second in air at 20 °C.", BRITANNICA),
  n("sci-n7", "Science", "At what temperature does iron melt, in degrees Celsius?", 1538, "°C", "Pure iron melts at 1,538 °C.", "Royal Society of Chemistry"),
  n("sci-n8", "Science", "How many minutes does sunlight take to reach the Earth?", 8.3, "minutes", "About 8 minutes and 20 seconds, or 8.3 minutes.", "NASA"),
  n("sci-n9", "Science", "How many chromosomes are in a normal human body cell?", 46, "chromosomes", "23 pairs, so 46 in total.", "National Human Genome Research Institute"),
  n("sci-n10", "Science", "How long is an African elephant pregnant, in months?", 22, "months", "About 22 months, the longest of any land animal.", BRITANNICA),
  n("sci-n11", "Science", "What is the average distance from the Earth to the Sun, in millions of kilometers?", 149.6, "million km", "About 149.6 million km: one astronomical unit.", "IAU"),
  n("sci-n12", "Science", "How many teeth does an adult human usually have, including wisdom teeth?", 32, "teeth", "A full adult set is 32 teeth.", BRITANNICA),
  n("sci-n13", "Science", "How tall is the Eiffel Tower today, including its antennas, in meters?", 330, "m", "330 m since a new antenna was added in 2022.", "Société d'Exploitation de la Tour Eiffel"),

  // Geography
  b("geo-b1", "Geography", "Which river is longer: the Nile or the Mekong?", ["The Nile", "The Mekong"], 0, "The Nile is about 6,650 km long. The Mekong is about 4,350-4,900 km, depending on how it is measured.", BRITANNICA),
  b("geo-b2", "Geography", "Which country has a larger area: Vietnam or Japan?", ["Vietnam", "Japan"], 1, "Japan is about 378,000 km². Vietnam is about 331,000 km².", BRITANNICA),
  b("geo-b3", "Geography", "Which city is farther north: Hanoi or Hong Kong?", ["Hanoi", "Hong Kong"], 1, "Hanoi is at about 21.0° N. Hong Kong is at about 22.3° N.", BRITANNICA),
  b("geo-b4", "Geography", "Which mountain is higher: Kilimanjaro or Mont Blanc?", ["Kilimanjaro", "Mont Blanc"], 0, "Kilimanjaro is 5,895 m. Mont Blanc is about 4,806 m.", BRITANNICA),
  b("geo-b5", "Geography", "Which is larger: Brazil or the 48 connected states of the USA?", ["Brazil", "The 48 US states"], 0, "Brazil is about 8.5 million km². The 48 connected states are about 8.1 million km², water included.", "IBGE (Brazil); US Census Bureau"),
  b("geo-b6", "Geography", "Which city is closer to the equator: Ho Chi Minh City or Bangkok?", ["Ho Chi Minh City", "Bangkok"], 0, "Ho Chi Minh City is at about 10.8° N. Bangkok is at about 13.8° N.", BRITANNICA),
  b("geo-b7", "Geography", "Which ocean is larger: the Atlantic or the Indian Ocean?", ["The Atlantic", "The Indian Ocean"], 0, "The Atlantic is about 85 million km². The Indian Ocean is about 70 million km².", BRITANNICA),
  b("geo-b8", "Geography", "Which is longer: the Great Wall of China (all its branches) or the Earth's equator?", ["The Great Wall", "The equator"], 1, "All branches of the Great Wall total about 21,200 km. The equator is about 40,075 km.", "China State Administration of Cultural Heritage (2012); NASA"),
  b("geo-b9", "Geography", "Which continent has more countries: Africa or Asia?", ["Africa", "Asia"], 0, "Africa has 54 countries. Asia has about 48.", "United Nations"),
  b("geo-b10", "Geography", "Which lake is deeper: Lake Baikal or Lake Tanganyika?", ["Lake Baikal", "Lake Tanganyika"], 0, "Baikal is about 1,642 m deep. Tanganyika is about 1,470 m.", BRITANNICA),
  b("geo-b11", "Geography", "Which capital city is farther south: Canberra or Buenos Aires?", ["Canberra", "Buenos Aires"], 0, "Canberra is at about 35.3° S. Buenos Aires is at about 34.6° S.", BRITANNICA),
  b("geo-b12", "Geography", "Which is larger in area: Greenland or Indonesia?", ["Greenland", "Indonesia"], 0, "Greenland is about 2.17 million km². Indonesia is about 1.9 million km².", BRITANNICA),
  b("geo-b13", "Geography", "Which city is farther west: Reno (Nevada) or Los Angeles?", ["Reno", "Los Angeles"], 0, "Reno is at about 119.8° W. Los Angeles is at about 118.2° W, because the coast curves east.", "US Geological Survey"),
  b("geo-b14", "Geography", "Which country has the longer coastline: Canada or Indonesia?", ["Canada", "Indonesia"], 0, "Canada's coastline, about 202,000 km, is the longest in the world.", "CIA World Factbook"),
  b("geo-b15", "Geography", "Which is higher: Mount Fuji or Mount Kinabalu?", ["Mount Fuji", "Mount Kinabalu"], 1, "Kinabalu is about 4,095 m. Fuji is about 3,776 m.", BRITANNICA),
  n("geo-n1", "Geography", "How long is the Nile River, in kilometers?", 6650, "km", "About 6,650 km.", BRITANNICA),
  n("geo-n2", "Geography", "How high is Mount Everest, in meters?", 8849, "m", "8,848.86 m, from the 2020 China-Nepal survey.", "China-Nepal joint survey (2020)"),
  n("geo-n3", "Geography", "What is the area of Australia, in millions of square kilometers?", 7.69, "million km²", "About 7.69 million km².", "Geoscience Australia"),
  n("geo-n4", "Geography", "How many countries are in Africa?", 54, "countries", "54 countries recognized by the United Nations.", "United Nations"),
  n("geo-n5", "Geography", "How deep is the deepest point of the ocean (the Challenger Deep), in meters?", 10935, "m", "About 10,935 m below sea level.", BRITANNICA),
  n("geo-n6", "Geography", "How tall is Angel Falls, the world's highest waterfall, in meters?", 979, "m", "979 m, with an unbroken drop of 807 m.", BRITANNICA),
  n("geo-n7", "Geography", "How deep is Lake Baikal at its deepest, in meters?", 1642, "m", "About 1,642 m, the deepest lake on Earth.", BRITANNICA),
  n("geo-n9", "Geography", "How many time zones does Russia have?", 11, "time zones", "Russia uses 11 time zones.", "Government of Russia"),
  n("geo-n10", "Geography", "How many islands does Japan have?", 14125, "islands", "14,125 islands, from a 2023 recount by Japan's mapping agency.", "Geospatial Information Authority of Japan (2023)"),
  n("geo-n11", "Geography", "How long is the Earth's equator, in kilometers?", 40075, "km", "About 40,075 km.", "NASA"),
  n("geo-n12", "Geography", "What is the area of Greenland, in millions of square kilometers?", 2.17, "million km²", "About 2.17 million km², the largest island in the world.", BRITANNICA),
  n("geo-n13", "Geography", "What is the area of the Caspian Sea, in square kilometers?", 371000, "km²", "About 371,000 km², the largest lake on Earth.", BRITANNICA),

  // History
  b("his-b1", "History", "Which came first: the founding of Harvard University or the birth of Isaac Newton?", ["Harvard University", "Newton's birth"], 0, "Harvard was founded in 1636. Newton was born in 1643.", BRITANNICA),
  b("his-b2", "History", "Which came first: the first Moon landing or the first flight of the Boeing 747?", ["The Moon landing", "The Boeing 747"], 1, "The 747 first flew in February 1969. Apollo 11 landed in July 1969.", "Boeing; NASA"),
  b("his-b3", "History", "Which came first: teaching at Oxford University or the founding of the Aztec city of Tenochtitlan?", ["Oxford University", "Tenochtitlan"], 0, "Teaching at Oxford existed by 1096. Tenochtitlan was founded in about 1325.", "University of Oxford; Britannica"),
  b("his-b4", "History", "Cleopatra lived closer in time to which event?", ["The building of the Great Pyramid", "The first Moon landing"], 1, "Cleopatra died in 30 BC, about 2,500 years after the Great Pyramid and about 2,000 years before the Moon landing.", BRITANNICA),
  b("his-b5", "History", "Which was invented first: the fax machine or the telephone?", ["The fax machine", "The telephone"], 0, "Alexander Bain patented a fax machine in 1843. Bell patented the telephone in 1876.", BRITANNICA),
  b("his-b6", "History", "Which came first: Gutenberg's printing press or the fall of Constantinople?", ["The printing press", "The fall of Constantinople"], 0, "Gutenberg was printing by about 1450. Constantinople fell in 1453.", BRITANNICA),
  b("his-b7", "History", "Which came first: the sinking of the Titanic or the first Ford Model T?", ["The Titanic sinking", "The Ford Model T"], 1, "The Model T was launched in 1908. The Titanic sank in 1912.", BRITANNICA),
  b("his-b8", "History", "Which came first: the French Revolution or the signing of the US Constitution?", ["The French Revolution", "The US Constitution"], 1, "The US Constitution was signed in 1787. The French Revolution began in 1789.", BRITANNICA),
  b("his-b9", "History", "Which came first: the first email or the first Moon landing?", ["The first email", "The Moon landing"], 1, "The Moon landing was in 1969. Ray Tomlinson sent the first network email in 1971.", BRITANNICA),
  b("his-b10", "History", "Which came first: the founding of Jamestown in America or Shakespeare's death?", ["Jamestown", "Shakespeare's death"], 0, "Jamestown was founded in 1607. Shakespeare died in 1616.", BRITANNICA),
  b("his-b11", "History", "Which came first: the end of World War I or the first commercial radio broadcast?", ["The end of World War I", "The first radio broadcast"], 0, "World War I ended in 1918. The first commercial radio broadcast was in 1920.", BRITANNICA),
  b("his-b12", "History", "Which came first: the fall of the Berlin Wall or the proposal for the World Wide Web?", ["The fall of the Berlin Wall", "The World Wide Web proposal"], 1, "Tim Berners-Lee proposed the Web in March 1989. The Wall fell in November 1989.", "CERN"),
  b("his-b13", "History", "Which came first: the Battle of Waterloo or the first bicycle?", ["The Battle of Waterloo", "The first bicycle"], 0, "Waterloo was in 1815. Karl Drais built his running machine, the first bicycle, in 1817.", BRITANNICA),
  b("his-b14", "History", "Which came first: the opening of the Suez Canal or the end of the American Civil War?", ["The Suez Canal", "The end of the Civil War"], 1, "The Civil War ended in 1865. The Suez Canal opened in 1869.", BRITANNICA),
  n("his-n1", "History", "How many years did the Hundred Years' War last?", 116, "years", "From 1337 to 1453: 116 years.", BRITANNICA),
  n("his-n2", "History", "How tall was the Great Pyramid of Giza when it was built, in meters?", 146.6, "m", "About 146.6 m. It is about 138.5 m today, after losing its outer stones.", BRITANNICA),
  n("his-n3", "History", "How long is the Great Wall of China with all its branches, in kilometers?", 21196, "km", "21,196 km, from a 2012 survey.", "China State Administration of Cultural Heritage (2012)"),
  n("his-n4", "History", "How many people have walked on the Moon?", 12, "people", "12 astronauts, all on Apollo missions from 1969 to 1972.", "NASA"),
  n("his-n5", "History", "How many countries were founding members of the United Nations in 1945?", 51, "countries", "50 countries signed the Charter in June 1945; Poland signed in October, making 51.", "United Nations"),
  n("his-n6", "History", "How many months did it take to build the Eiffel Tower?", 26, "months", "About 2 years and 2 months, from 1887 to 1889.", "Société d'Exploitation de la Tour Eiffel"),
  n("his-n7", "History", "How many oil paintings did Vincent van Gogh make?", 860, "paintings", "About 860 oil paintings, most in his last ten years.", "Van Gogh Museum"),
  n("his-n8", "History", "How long was the Berlin Wall around West Berlin, in kilometers?", 155, "km", "About 155 km.", "Berlin Wall Foundation"),
  n("his-n9", "History", "How tall is the Mona Lisa painting, in centimeters?", 77, "cm", "77 cm by 53 cm, smaller than many people expect.", "Louvre Museum"),
  n("his-n10", "History", "How many days did the Apollo 11 mission last, from launch to splashdown?", 8, "days", "About 8 days and 3 hours, 16-24 July 1969.", "NASA"),
  n("his-n11", "History", "How long was the Titanic, in meters?", 269, "m", "About 269 m.", BRITANNICA),

  // Money & numbers (exact calculations)
  b("num-b1", "Money & numbers", "Which is bigger: 1.01 multiplied by itself 365 times, or 3?", ["1.01 to the power 365", "3"], 0, "1.01 to the power 365 is about 37.8. Small daily growth adds up.", EXACT),
  b("num-b2", "Money & numbers", "Which is the bigger discount: 10% off and then another 10% off, or 20% off once?", ["10% off twice", "20% off once"], 1, "10% off twice leaves 81% of the price (19% off). 20% off leaves 80%.", EXACT),
  b("num-b3", "Money & numbers", "After 30 years, which is worth more: $10,000 at 5% a year, or $20,000 at 2% a year (both compounded yearly)?", ["$10,000 at 5%", "$20,000 at 2%"], 0, "$10,000 at 5% grows to about $43,200. $20,000 at 2% grows to about $36,200.", EXACT),
  b("num-b4", "Money & numbers", "Which is more likely: two heads in two coin flips, or at least one six in four dice rolls?", ["Two heads", "At least one six"], 1, "Two heads: 25%. At least one six in four rolls: about 52%.", EXACT),
  b("num-b5", "Money & numbers", "Which is more: the number of seconds in a week, or 600,000?", ["Seconds in a week", "600,000"], 0, "A week has 604,800 seconds.", EXACT),
  b("num-b6", "Money & numbers", "Which costs a borrower more over a year: 1% interest a month (compounded), or 12% a year?", ["1% a month", "12% a year"], 0, "1% a month compounded is about 12.68% a year.", EXACT),
  b("num-b7", "Money & numbers", "Which is bigger: 2 to the power 10, or 10 to the power 3?", ["2 to the power 10", "10 to the power 3"], 0, "2 to the power 10 is 1,024. 10 to the power 3 is 1,000.", EXACT),
  b("num-b8", "Money & numbers", "With two dice, which total is more likely: 7 or 6?", ["7", "6"], 0, "7 can be made 6 ways out of 36. 6 can be made 5 ways.", EXACT),
  b("num-b9", "Money & numbers", "In a room of 30 people, is it more likely than not that two share a birthday?", ["More likely than not", "Less likely than not"], 0, "The chance is about 71%. With 23 people it is already about 50%.", EXACT),
  b("num-b10", "Money & numbers", "A price goes up 50%, then down 50%. Compared with the start, is it now higher or lower?", ["Higher", "Lower"], 1, "100 becomes 150, then 75: lower than the start.", EXACT),
  b("num-b11", "Money & numbers", "Which is longer: one million seconds or one week?", ["One million seconds", "One week"], 0, "One million seconds is about 11.6 days.", EXACT),
  b("num-b12", "Money & numbers", "With 3% inflation every year for 24 years, do prices more than double?", ["Yes, more than double", "No, less than double"], 0, "1.03 to the power 24 is about 2.03, just over double.", EXACT),
  n("num-n1", "Money & numbers", "You put $1,000 in an account at 7% a year, compounded yearly. How much is there after 10 years, in dollars?", 1967, "$", "1,000 × 1.07 to the power 10 = about $1,967.", EXACT),
  n("num-n2", "Money & numbers", "At 6% interest a year, compounded yearly, how many years does it take for money to double?", 11.9, "years", "About 11.9 years. The rule of 72 gives 72 / 6 = 12.", EXACT),
  n("num-n3", "Money & numbers", "How many days are in one million seconds?", 11.6, "days", "1,000,000 / 86,400 = about 11.6 days.", EXACT),
  n("num-n4", "Money & numbers", "How many years are in one billion seconds?", 31.7, "years", "About 31.7 years.", EXACT),
  n("num-n5", "Money & numbers", "A $10,000 loan at 1% a month is paid back in 12 equal monthly payments. How much is each payment, in dollars?", 888, "$", "About $888.49 a month.", EXACT),
  n("num-n6", "Money & numbers", "If prices rise 4% every year, how many years does it take for them to double?", 17.7, "years", "About 17.7 years.", EXACT),
  n("num-n7", "Money & numbers", "How many different tickets are possible in a 6-from-45 lottery (pick 6 numbers from 1 to 45)?", 8145060, "tickets", "8,145,060 combinations, so one ticket has about a 1 in 8 million chance.", EXACT),
  n("num-n8", "Money & numbers", "A $1,000 debt grows 2% a month for 12 months with no payments. How much is owed, in dollars?", 1268, "$", "1,000 × 1.02 to the power 12 = about $1,268.", EXACT),
  n("num-n9", "Money & numbers", "How many hours are in a (non-leap) year?", 8760, "hours", "365 × 24 = 8,760 hours.", EXACT),
  n("num-n10", "Money & numbers", "In how many different orders can you put 5 different books on a shelf?", 120, "orders", "5 × 4 × 3 × 2 × 1 = 120.", EXACT),
  n("num-n11", "Money & numbers", "How many people must be in a room for the chance that two share a birthday to pass 50%?", 23, "people", "23 people give a chance of about 50.7%.", EXACT),
  n("num-n12", "Money & numbers", "You invest $5,000 at 8% a year, compounded yearly. How much is it worth after 5 years, in dollars?", 7347, "$", "5,000 × 1.08 to the power 5 = about $7,347.", EXACT),

  // Vietnam
  b("vn-b1", "Vietnam", "Which came first: Thang Long (Hanoi) becoming the capital, or the Battle of Hastings in England?", ["Thang Long as capital", "The Battle of Hastings"], 0, "Ly Thai To moved the capital to Thang Long in 1010. Hastings was in 1066.", BRITANNICA),
  b("vn-b2", "Vietnam", "Which country has more people: Vietnam or Germany?", ["Vietnam", "Germany"], 0, "Vietnam had about 101.1 million people in 2024. Germany had about 83.6 million.", "General Statistics Office of Vietnam; Destatis"),
  b("vn-b3", "Vietnam", "Which is taller: Landmark 81 in Ho Chi Minh City or the Petronas Towers in Kuala Lumpur?", ["Landmark 81", "The Petronas Towers"], 0, "Landmark 81 is about 461 m. The Petronas Towers are about 452 m.", "Council on Tall Buildings and Urban Habitat"),
  b("vn-b4", "Vietnam", "Which is longer: Vietnam's coastline or the North-South railway from Hanoi to Ho Chi Minh City?", ["The coastline", "The railway"], 0, "The coastline is about 3,260 km (some sources say 3,444 km). The railway is about 1,726 km.", "Government of Vietnam; Vietnam Railways"),
  b("vn-b5", "Vietnam", "Which country exports more coffee: Vietnam or Colombia?", ["Vietnam", "Colombia"], 0, "Vietnam is the world's second-largest coffee producer, after Brazil, and well ahead of Colombia.", "International Coffee Organization"),
  b("vn-b6", "Vietnam", "Which country has a larger area: Vietnam or Italy?", ["Vietnam", "Italy"], 0, "Vietnam is about 331,000 km². Italy is about 302,000 km².", BRITANNICA),
  b("vn-b7", "Vietnam", "Which is higher: Fansipan or Mount Fuji?", ["Fansipan", "Mount Fuji"], 1, "Mount Fuji is about 3,776 m. Fansipan is about 3,147 m.", BRITANNICA),
  b("vn-b8", "Vietnam", "Which city is farther south: Da Nang or Bangkok?", ["Da Nang", "Bangkok"], 1, "Da Nang is at about 16.1° N. Bangkok is at about 13.8° N.", BRITANNICA),
  b("vn-b9", "Vietnam", "Which became a UNESCO World Heritage Site first: Ha Long Bay or Hoi An Ancient Town?", ["Ha Long Bay", "Hoi An"], 0, "Ha Long Bay was listed in 1994. Hoi An was listed in 1999.", "UNESCO"),
  b("vn-b10", "Vietnam", "Which country officially recognizes more ethnic groups: Vietnam or China?", ["Vietnam", "China"], 1, "China recognizes 56 ethnic groups. Vietnam recognizes 54.", "Government of Vietnam; Government of China"),
  b("vn-b11", "Vietnam", "Which came first: the Battle of Dien Bien Phu or the founding of ASEAN?", ["Dien Bien Phu", "The founding of ASEAN"], 0, "Dien Bien Phu was in 1954. ASEAN was founded in 1967.", BRITANNICA),
  b("vn-b12", "Vietnam", "Which did Vietnam join first: ASEAN or the World Trade Organization?", ["ASEAN", "The WTO"], 0, "Vietnam joined ASEAN in 1995 and the WTO in 2007.", "ASEAN; WTO"),
  b("vn-b13", "Vietnam", "Which battle on the Bach Dang River came first: Ngo Quyen's or Tran Hung Dao's?", ["Ngo Quyen's", "Tran Hung Dao's"], 0, "Ngo Quyen won in 938. Tran Hung Dao won in 1288.", BRITANNICA),
  n("vn-n1", "Vietnam", "What was Vietnam's population in 2024, in millions?", 101.1, "million people", "About 101.1 million people.", "General Statistics Office of Vietnam (2024)"),
  n("vn-n2", "Vietnam", "What is the land area of Vietnam, in square kilometers?", 331212, "km²", "About 331,212 km².", "General Statistics Office of Vietnam"),
  n("vn-n4", "Vietnam", "How many ethnic groups does Vietnam officially recognize?", 54, "groups", "54 ethnic groups.", "Government of Vietnam"),
  n("vn-n5", "Vietnam", "How high is Fansipan, the highest mountain in Indochina, in meters?", 3147, "m", "About 3,147 m from a recent survey. Older books say 3,143 m.", BRITANNICA),
  n("vn-n6", "Vietnam", "How tall is Landmark 81 in Ho Chi Minh City, in meters?", 461, "m", "About 461 m.", "Council on Tall Buildings and Urban Habitat"),
  n("vn-n7", "Vietnam", "How long is the North-South railway from Hanoi to Ho Chi Minh City, in kilometers?", 1726, "km", "About 1,726 km.", "Vietnam Railways"),
  n("vn-n8", "Vietnam", "How long is the Hai Van road tunnel, in meters?", 6280, "m", "About 6,280 m, one of the longest road tunnels in Southeast Asia.", "Ministry of Transport of Vietnam"),
  n("vn-n10", "Vietnam", "How many stations does Ho Chi Minh City's first metro line (Ben Thanh - Suoi Tien) have?", 14, "stations", "14 stations: 3 underground and 11 elevated.", "Ho Chi Minh City Management Authority for Urban Railways"),
  n("vn-n9", "Vietnam", "How long is Ho Chi Minh City's first metro line (Ben Thanh - Suoi Tien), in kilometers?", 19.7, "km", "About 19.7 km, opened in December 2024.", "Ho Chi Minh City Management Authority for Urban Railways"),
];
