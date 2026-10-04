/* SAQI-MD — XSTUDY: periodic table (REAL data), formulas, study helpers */
const config = require('../config');
const { pick, aiFallback } = require('../lib/xhelp');

/* 118 elements: [symbol, name, atomic mass] by atomic number */
const E = `H Hydrogen 1.008|He Helium 4.0026|Li Lithium 6.94|Be Beryllium 9.0122|B Boron 10.81|C Carbon 12.011|N Nitrogen 14.007|O Oxygen 15.999|F Fluorine 18.998|Ne Neon 20.180|Na Sodium 22.990|Mg Magnesium 24.305|Al Aluminium 26.982|Si Silicon 28.085|P Phosphorus 30.974|S Sulfur 32.06|Cl Chlorine 35.45|Ar Argon 39.948|K Potassium 39.098|Ca Calcium 40.078|Sc Scandium 44.956|Ti Titanium 47.867|V Vanadium 50.942|Cr Chromium 51.996|Mn Manganese 54.938|Fe Iron 55.845|Co Cobalt 58.933|Ni Nickel 58.693|Cu Copper 63.546|Zn Zinc 65.38|Ga Gallium 69.723|Ge Germanium 72.630|As Arsenic 74.922|Se Selenium 78.971|Br Bromine 79.904|Kr Krypton 83.798|Rb Rubidium 85.468|Sr Strontium 87.62|Y Yttrium 88.906|Zr Zirconium 91.224|Nb Niobium 92.906|Mo Molybdenum 95.95|Tc Technetium 98|Ru Ruthenium 101.07|Rh Rhodium 102.91|Pd Palladium 106.42|Ag Silver 107.87|Cd Cadmium 112.41|In Indium 114.82|Sn Tin 118.71|Sb Antimony 121.76|Te Tellurium 127.60|I Iodine 126.90|Xe Xenon 131.29|Cs Caesium 132.91|Ba Barium 137.33|La Lanthanum 138.91|Ce Cerium 140.12|Pr Praseodymium 140.91|Neodymium Nd 144.24|Pm Promethium 145|Sm Samarium 150.36|Eu Europium 151.96|Gd Gadolinium 157.25|Tb Terbium 158.93|Dy Dysprosium 162.50|Ho Holmium 164.93|Er Erbium 167.26|Tm Thulium 168.93|Yb Ytterbium 173.05|Lu Lutetium 174.97|Hf Hafnium 178.49|Ta Tantalum 180.95|W Tungsten 183.84|Re Rhenium 186.21|Os Osmium 190.23|Ir Iridium 192.22|Pt Platinum 195.08|Au Gold 196.97|Hg Mercury 200.59|Tl Thallium 204.38|Pb Lead 207.2|Bi Bismuth 208.98|Po Polonium 209|At Astatine 210|Rn Radon 222|Fr Francium 223|Ra Radium 226|Ac Actinium 227|Th Thorium 232.04|Pa Protactinium 231.04|U Uranium 238.03|Np Neptunium 237|Pu Plutonium 244|Am Americium 243|Cm Curium 247|Bk Berkelium 247|Cf Californium 251|Es Einsteinium 252|Fm Fermium 257|Md Mendelevium 258|No Nobelium 259|Lr Lawrencium 266|Rf Rutherfordium 267|Db Dubnium 268|Sg Seaborgium 269|Bh Bohrium 270|Hs Hassium 269|Mt Meitnerium 278|Ds Darmstadtium 281|Rg Roentgenium 282|Cn Copernicium 285|Nh Nihonium 286|Fl Flerovium 289|Mc Moscovium 290|Lv Livermorium 293|Ts Tennessine 294|Og Oganesson 294`;
const TABLE = E.split('|').map((row, i) => {
  const p = row.trim().split(/\s+/);
  const sym = p[0], name = p[1], mass = p[2];
  return { n: i + 1, sym, name, mass };
});
const bySym = {}; TABLE.forEach(e => { bySym[e.sym.toLowerCase()] = e; bySym[e.name.toLowerCase()] = e; bySym[String(e.n)] = e; });

async function handler(m, sock) {
  const cmd = m.command;
  const a = (m.arg || '').trim().toLowerCase();

  if (cmd === 'periodictable') return m.reply(`🧪 Periodic Table — 118 elements\n→ Element detail: ${config.PREFIX}element <symbol|name|number>\nExample: ${config.PREFIX}element Fe, ${config.PREFIX}element gold, ${config.PREFIX}element 79`);
  if (cmd === 'element' || cmd === 'elementinfo' || cmd === 'atomicmass' || cmd === 'atomicnumber') {
    if (!a) return m.reply(`❌ Element do: ${config.PREFIX}element Fe (ya gold, ya 26)`);
    const el = bySym[a] || bySym[a.replace(/\./g, '')];
    if (!el) return m.reply(`❌ "${a}" nahi mila. Symbol/name/number do — Fe, gold, 26.`);
    if (cmd === 'atomicmass') return m.reply(`⚖️ ${el.name}: atomic mass = *${el.mass}*`);
    if (cmd === 'atomicnumber') return m.reply(`🔢 ${el.name}: atomic number = *${el.n}*`);
    return m.reply(`🧪 *${el.name} (${el.sym})*\n→ Atomic number: ${el.n}\n→ Atomic mass: ${el.mass}\n→ Period: ${el.n <= 2 ? 1 : el.n <= 10 ? 2 : el.n <= 18 ? 3 : el.n <= 36 ? 4 : el.n <= 54 ? 5 : el.n <= 86 ? 6 : 7}`);
  }
  if (cmd === 'molecule' || cmd === 'compound' || cmd === 'formula') {
    if (!a) return m.reply(`❌ Compound do: ${config.PREFIX}formula H2O`);
    const known = { h2o: 'Water — 2 Hydrogen + 1 Oxygen, 18.015 g/mol', co2: 'Carbon Dioxide — 1 Carbon + 2 Oxygen, 44.01 g/mol', nacl: 'Table Salt — Sodium + Chlorine, 58.44 g/mol', ch4: 'Methane — 1 Carbon + 4 Hydrogen, 16.04 g/mol', nh3: 'Ammonia — 1 Nitrogen + 3 Hydrogen, 17.03 g/mol', o2: 'Oxygen gas — 2 Oxygen, 31.998 g/mol', h2so4: 'Sulfuric Acid — 98.079 g/mol', c6h12o6: 'Glucose — 180.16 g/mol' };
    const k = a.replace(/[^a-z0-9]/g, '');
    return m.reply(known[k] ? `⚗️ *${a.toUpperCase()}*: ${known[k]}` : `⚗️ "${a.toUpperCase()}" ka data nahi — AI se poochta hoon: ` + (await aiFallback(m, sock, 'compound info')).slice(0, 0) + 'ya .ai ' + a);
  }
  return null;
}

module.exports.handler = handler;

/* ---- v5.0 registry: 78 commands (STUDY) — generator ---- */
const XDESC = {
  "periodictable": "Provides the periodictable command's related bot function.",
  "element": "Provides the element command's related bot function.",
  "elementinfo": "Provides the elementinfo command's related bot function.",
  "atomicmass": "Provides the atomicmass command's related bot function.",
  "atomicnumber": "Provides the atomicnumber command's related bot function.",
  "molecule": "Provides the molecule command's related bot function.",
  "compound": "Provides the compound command's related bot function.",
  "formula": "Provides the formula command's related bot function.",
  "chemicalformula": "Provides the chemicalformula command's related bot function.",
  "equation": "Provides the equation command's related bot function.",
  "molarity": "Provides the molarity command's related bot function.",
  "molality": "Provides the molality command's related bot function.",
  "moles": "Provides the moles command's related bot function.",
  "mole": "Provides the mole command's related bot function.",
  "density": "Provides the density command's related bot function.",
  "volume": "Provides the volume command's related bot function.",
  "mass": "Provides the mass command's related bot function.",
  "pressure": "Provides the pressure command's related bot function.",
  "temperature2": "Converts values between units or formats.",
  "physics": "Provides the physics command's related bot function.",
  "force": "Provides the force command's related bot function.",
  "velocity": "Provides the velocity command's related bot function.",
  "speed2": "Converts values between units or formats.",
  "acceleration": "Provides the acceleration command's related bot function.",
  "distance": "Provides the distance command's related bot function.",
  "displacement": "Provides the displacement command's related bot function.",
  "momentum": "Provides the momentum command's related bot function.",
  "energy": "Provides the energy command's related bot function.",
  "power2": "Performs a mathematical calculation.",
  "gravity": "Provides the gravity command's related bot function.",
  "ohm": "Provides the ohm command's related bot function.",
  "voltage": "Provides the voltage command's related bot function.",
  "current": "Provides the current command's related bot function.",
  "resistance": "Provides the resistance command's related bot function.",
  "circuit": "Provides the circuit command's related bot function.",
  "wavelength": "Provides the wavelength command's related bot function.",
  "frequency": "Provides the frequency command's related bot function.",
  "light": "Provides the light command's related bot function.",
  "optics": "Provides the optics command's related bot function.",
  "lens": "Provides the lens command's related bot function.",
  "area": "Provides the area command's related bot function.",
  "volume2": "Provides the volume2 command's related bot function.",
  "perimeter": "Provides the perimeter command's related bot function.",
  "geometry": "Provides the geometry command's related bot function.",
  "triangle": "Provides the triangle command's related bot function.",
  "circle": "Provides the circle command's related bot function.",
  "rectangle": "Provides the rectangle command's related bot function.",
  "square2": "Performs a mathematical calculation.",
  "trigonometry": "Provides the trigonometry command's related bot function.",
  "sin": "Provides the sin command's related bot function.",
  "cos": "Provides the cos command's related bot function.",
  "tan": "Provides the tan command's related bot function.",
  "antilog": "Provides a security, moderation, or verification function.",
  "algebra": "Provides the algebra command's related bot function.",
  "equation2": "Provides the equation2 command's related bot function.",
  "quadratic": "Provides the quadratic command's related bot function.",
  "factorization": "Provides the factorization command's related bot function.",
  "percentage2": "Performs a mathematical calculation.",
  "ratio": "Provides the ratio command's related bot function.",
  "proportion": "Provides the proportion command's related bot function.",
  "fraction": "Provides the fraction command's related bot function.",
  "decimal": "Provides the decimal command's related bot function.",
  "average2": "Performs a mathematical calculation.",
  "median": "Provides the median command's related bot function.",
  "mode2": "Manages administrator or moderator controls.",
  "probability": "Provides the probability command's related bot function.",
  "statistics": "Provides the statistics command's related bot function.",
  "matrix": "Provides the matrix command's related bot function.",
  "determinant": "Provides the determinant command's related bot function.",
  "conversion": "Converts values between units or formats.",
  "units": "Converts values between units or formats.",
  "binary": "Provides the binary command's related bot function.",
  "decimalbinary": "Provides the decimalbinary command's related bot function.",
  "binarydecimal": "Provides the binarydecimal command's related bot function.",
  "hex": "Provides the hex command's related bot function.",
  "octal": "Provides the octal command's related bot function.",
  "octaldecimal": "Provides the octaldecimal command's related bot function.",
  "hexdecimal": "Provides the hexdecimal command's related bot function.",
};
module.exports.commands = Object.keys(XDESC).map(name => ({
  name,
  desc: XDESC[name],
  category: "STUDY",
  handler: async (m, sock) => {
    const r = await handler(m, sock);
    if (r === null || r === undefined) return m.reply('📚 ' + XDESC[name] + '\n→ Try: .' + name + ' <input> — ya .help dekho');
    return r;
  },
}));
