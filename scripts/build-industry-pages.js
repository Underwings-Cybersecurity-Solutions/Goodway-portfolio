/**
 * Generate 8 per-industry landing pages under /industries/<slug>.html
 * Keeps the shared nav + footer consistent with industries.html; each
 * page's hero, facts, divisions-served, principals-used and typical-
 * applications copy is unique per sector.  Idempotent — safe to rerun.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'industries');
fs.mkdirSync(OUT_DIR, { recursive: true });

/* ----- per-division metadata (short blurbs for the "Who we supply" grid) ----- */
const DIV = {
  'chemicals-power':    { name: 'Chemicals &amp; Power', blurb: 'Petroleum production chemicals, process chemicals, DC/AC power supplies, UPS and Ex-proof lighting.' },
  'electrical':         { name: 'Electrical',            blurb: 'HV &amp; MV motors, switchgear, circuit breakers, bus way and industrial cables.' },
  'instrumentation':    { name: 'Instrumentation',       blurb: 'Meteorological sensors, environmental monitoring, level switches, industrial gauges.' },
  'mechanical':         { name: 'Mechanical Items',      blurb: 'Valves, flanges, bolts, compressor spares, couplings and lifting gear.' },
  'scientific-lab':     { name: 'Scientific &amp; Lab Instrumentation', blurb: 'Temperature, pressure and specific-gravity measurement; analytical lab equipment.' },
  'heavy-equipment':    { name: 'Heavy Equipment &amp; Spares', blurb: 'Earth-moving machinery, OEM-quality Caterpillar &amp; Komatsu spares, compressor rebuild parts.' },
  'building-material':  { name: 'Building Material',     blurb: 'Civil Defence-approved fire-rated steel doors, wood doors and architectural joinery.' },
  'road-safety':        { name: 'Road &amp; Industrial Safety', blurb: 'Barriers, cones, reflective gear, fall-arrest harnesses and lifting/lashing accessories.' },
  'office-equipment':   { name: 'Office Equipment &amp; Stationery', blurb: '20,000+ SKUs from 3M, Brother, Avery, Leitz, Fellowes, GBC and more.' },
};

/* ----- 8 sector definitions ----- */
const sectors = [
  {
    slug: 'oil-gas',
    title: 'Oil &amp; Gas Supplier UAE — Authorised Distribution | Goodway',
    desc:  'UAE onshore &amp; offshore oil &amp; gas supply: DC power supplies &amp; UPS (AEES), process instrumentation (ATMI), motors (Westinghouse) and lab analytics — authorised distribution under ADNOC-compliant paperwork.',
    eyebrow: '// Industries · Oil &amp; Gas',
    h1: 'Authorised supply to UAE oil &amp; gas operators.',
    lede: 'Goodway supplies onshore and offshore oil &amp; gas operators, EPC contractors and refinery maintenance teams across the UAE with specialty chemicals, motors, valves and instrumentation &mdash; all under authorised distribution agreements with ADNOC-compliant paperwork.',
    stats: [
      { num: 'CN-1843054', label: 'DED licence covers onshore &amp; offshore O&amp;G fields and facilities services' },
      { num: 'ADNOC', label: 'Compliant transit paperwork on every shipment' },
      { num: '3+', label: 'Power-electronics and process-instrument principals: AEES, ATMI, Westinghouse' }
    ],
    divisions: ['chemicals-power', 'electrical', 'instrumentation', 'mechanical'],
    principals: [
      { name: 'AEES',                 country: 'France', role: 'DC power supplies &amp; UPS for process systems' },
      { name: 'ATMI',                 country: 'France', role: 'Process instrumentation &amp; level switches' },
      { name: 'Westinghouse',         country: 'USA',    role: 'HV/MV motors for upstream and refining' },
      { name: 'Yuasa',                country: 'Japan',  role: 'Standby batteries for SCADA &amp; protection' },
      { name: 'L&uuml;tze',           country: 'Germany', role: 'Industrial cables &amp; wiring systems' },
      { name: 'McMaster-Carr',        country: 'USA',    role: 'Mechanical hardware &amp; consumables' }
    ],
    applications: [
      'Specialty chemical injection for production enhancement and corrosion control on upstream fields',
      'HV &amp; MV motor supply and emergency rebuild spares for pumps, compressors and separators',
      'Process instrumentation &mdash; pressure, temperature and flow &mdash; with calibration certificates',
      'Standby battery banks for SCADA, DCS and safety-critical process control',
      'Industrial cabling, wiring systems and mechanical hardware for plant installations'
    ]
  },
  {
    slug: 'petrochemical',
    title: 'Petrochemical Supplier UAE — Lab Analytics &amp; Process Instrumentation | Goodway',
    desc:  'Authorised UAE supply for petrochemical plants: Fisher Scientific and Merck laboratory chemistry, process analyzers, instrumentation and Ex-proof fixtures for refinery and petrochemical complexes.',
    eyebrow: '// Industries · Petrochemical',
    h1: 'Lab analytics and process instrumentation for UAE petrochemical plants.',
    lede: 'Petrochemical complexes run on laboratory-grade analytics, continuous process measurement and strict hazardous-area compliance. Goodway supplies the UAE\'s refining and petrochemical plants with Fisher Scientific &amp; Merck lab chemistry, process instrumentation and Ex-certified electrical fixtures under a single UAE desk.',
    stats: [
      { num: 'UK · DE', label: 'Fisher Scientific (UK) and Merck (Germany) as authorised UAE channels' },
      { num: '15+', label: 'Measurement &amp; analyser OEMs under principal network' },
      { num: 'ISO', label: 'Calibration-grade instruments with traceable standards' }
    ],
    divisions: ['scientific-lab', 'instrumentation', 'chemicals-power', 'electrical'],
    principals: [
      { name: 'Fisher Scientific',    country: 'UK',      role: 'Laboratory chemicals, glassware, analytical reagents' },
      { name: 'Merck',                country: 'Germany', role: 'Industrial &amp; laboratory chemistry' },
      { name: 'ATMI',                 country: 'France',  role: 'Process gas detection &amp; monitoring' },
      { name: 'Westinghouse',         country: 'USA',     role: 'HV motors for compression &amp; process trains' },
      { name: 'L&uuml;tze',           country: 'Germany', role: 'Industrial cabling &amp; wiring systems' }
    ],
    applications: [
      'Plant laboratory fit-out &mdash; analytical balances, pH meters, spectrophotometers, glassware and reagents',
      'Process chromatography &amp; gas analysis for refinery feed and product streams',
      'Certified pressure, flow and temperature transmitters with DCS-ready signalling',
      'Industrial cabling and wiring systems for refinery and petrochemical plant installations',
      'VAT-compliant consumables replenishment under a single blanket order'
    ]
  },
  {
    slug: 'power',
    title: 'Power Generation Supplier UAE — Motors, Switchgear &amp; UPS | Goodway',
    desc:  'UAE power station and substation supply: ABB, WEG, Westinghouse motors; ABB, Siemens, Merlin Gerin switchgear; Yuasa standby batteries &mdash; authorised distribution with documented origin.',
    eyebrow: '// Industries · Power Generation',
    h1: 'Motors, switchgear and UPS for UAE power stations.',
    lede: 'UAE power stations, substations and transmission utilities source HV &amp; MV rotating machines, switchgear, protection hardware and standby battery systems from Goodway under authorised distribution &mdash; with the paperwork package Transco, EWEC and ADWEA procurement need on day one.',
    stats: [
      { num: 'HV / MV', label: 'High and medium voltage motor supply and rebuild spares' },
      { num: '8', label: 'Switchgear OEMs: ABB · Siemens · Merlin Gerin · Square D · GE · Westinghouse · Allen-Bradley · Omron' },
      { num: 'Yuasa', label: 'Authorised UAE channel for sealed lead-acid standby batteries' }
    ],
    divisions: ['electrical', 'chemicals-power', 'instrumentation'],
    principals: [
      { name: 'ABB',                  country: 'Switzerland', role: 'HV motors and primary switchgear' },
      { name: 'WEG',                  country: 'Brazil',      role: 'MV motors and variable-speed drives' },
      { name: 'Westinghouse',         country: 'USA',         role: 'AC/DC motors for generation and auxiliaries' },
      { name: 'Yuasa',                country: 'Japan',       role: 'Sealed lead-acid standby batteries' },
      { name: 'L&uuml;tze',           country: 'Germany',     role: 'Industrial cabling &amp; wiring systems' }
    ],
    applications: [
      'HV &amp; MV motor supply for boiler feed pumps, condensate pumps and forced-draft fans',
      'Primary and secondary switchgear, circuit breakers and protection relays for generation step-up stations',
      'Standby battery banks for control rooms and protection schemes',
      'Cabling, bus way and distribution hardware from Lütze and industry-standard brands',
      'Process instrumentation and level switches for fuel-handling and storage areas'
    ]
  },
  {
    slug: 'water',
    title: 'Water &amp; Wastewater Supplier UAE — Treatment Chemicals &amp; Instrumentation | Goodway',
    desc:  'UAE water treatment and desalination supply: AEES UPS and emergency lighting, ATMI level switches, flow and pressure instrumentation for municipal, industrial and desalination plants.',
    eyebrow: '// Industries · Water &amp; Wastewater',
    h1: 'Treatment chemicals and instrumentation for UAE water &amp; wastewater plants.',
    lede: 'Desalination plants, municipal treatment works and industrial effluent systems across the UAE rely on consistent supply of treatment chemicals, level and flow measurement, valves and pump spares. Goodway bundles all of that under one authorised UAE desk.',
    stats: [
      { num: 'AEES', label: 'French principal for plant UPS, DC power and emergency lighting' },
      { num: 'ATMI', label: 'French principal for level switches and process instruments' },
      { num: '7', label: 'All seven emirates served for warehouse-to-plant delivery' }
    ],
    divisions: ['chemicals-power', 'instrumentation', 'mechanical'],
    principals: [
      { name: 'AEES',     country: 'France',  role: 'UPS, DC power systems and emergency lighting' },
      { name: 'ATMI',     country: 'France',  role: 'Level switches, flow and pressure instruments' },
      { name: 'Efftec',   country: 'Australia', role: 'Environmental and effluent monitoring' },
      { name: 'McMaster-Carr', country: 'USA', role: 'Valves, flanges, fittings and mechanical spares' }
    ],
    applications: [
      'Coagulant, flocculant and biocide dosing chemistry for desalination and municipal plants',
      'Capacitance and vibration level switches for basins, sumps and chemical storage',
      'Pressure and flow transmitters with HART-enabled signalling for SCADA integration',
      'Pump spares, mechanical seals and valve rebuilds &mdash; Caterpillar and Komatsu auxiliary',
      'Effluent monitoring instrumentation with calibration certificates'
    ]
  },
  {
    slug: 'government',
    title: 'UAE Government &amp; Civil Defence Supplier — Compliance-First | Goodway',
    desc:  'Authorised UAE supply into government facilities, ministries and Civil Defence-approved projects: NFPA 80 fire-rated doors, hazardous-area fixtures, safety equipment and office catalogues.',
    eyebrow: '// Industries · Government &amp; Civil Defence',
    h1: 'Compliance-first supply into UAE government facilities.',
    lede: 'UAE federal and emirate-level government buyers, ministries, schools, hospitals and Civil Defence-regulated projects need suppliers that turn up with the paperwork already done. Goodway\'s Civil Defence-approved fire-door network, hazardous-area fixture range and office catalogue make that the default.',
    stats: [
      { num: 'NFPA 80', label: 'Fire-rated steel doors tested to the UAE Civil Defence standard' },
      { num: 'CD', label: 'Civil Defence approved supplier network across all seven emirates' },
      { num: '20k+', label: 'Office equipment and stationery SKUs for institutional fit-outs' }
    ],
    divisions: ['building-material', 'road-safety', 'office-equipment', 'electrical'],
    principals: [
      { name: 'McMaster-Carr',       country: 'USA',  role: 'Safety equipment, PPE and mechanical hardware' },
      { name: 'Civil Defence-registered fabricators', country: 'UAE', role: 'NFPA 80 fire-rated steel doors' },
      { name: '3M · Brother · Leitz', country: '—',   role: 'Office equipment for ministries and institutional offices' }
    ],
    applications: [
      'Civil Defence-approved fire-rated steel doors (&frac12;h &mdash; 2h rating, 20/18/16 gauge) for schools, hospitals and labour camps',
      'NFPA 80-compliant door hardware packages and testing certificates bundled with delivery',
      'Mechanical hardware and protective equipment for facilities maintenance and storage areas',
      'Fall-arrest and PPE kits for facilities maintenance teams',
      'Office fit-out catalogues (stationery, printing consumables, filing, shredding) for ministries'
    ],
    journal: { title: 'Civil Defence fire-door compliance, explained without the paperwork headache', href: '../journal/civil-defence-fire-door-compliance.html' }
  },
  {
    slug: 'construction',
    title: 'Construction &amp; Infrastructure Supplier UAE — Fire Doors, Heavy Equipment, Road Safety | Goodway',
    desc:  'UAE construction supply: Civil Defence fire-rated doors, Caterpillar and Komatsu heavy-equipment spares, road-safety barriers, PPE and lifting/lashing equipment for main contractors.',
    eyebrow: '// Industries · Construction &amp; Infrastructure',
    h1: 'Fire doors, heavy-equipment spares and road safety for UAE construction.',
    lede: 'UAE main contractors and infrastructure EPC teams running Abu Dhabi, Dubai and Northern-Emirates projects source Civil Defence fire doors, Caterpillar/Komatsu spares, road-safety delineation and site PPE from Goodway as a single authorised channel.',
    stats: [
      { num: 'NFPA 80', label: 'Civil Defence-approved fire-door design standard' },
      { num: '55+', label: 'Heavy-equipment compressor &amp; engine OEMs supported' },
      { num: '7', label: 'Emirates served warehouse-to-site with one delivery line' }
    ],
    divisions: ['building-material', 'heavy-equipment', 'road-safety', 'mechanical'],
    principals: [
      { name: 'Caterpillar',        country: 'USA',     role: 'Heavy earth-moving equipment and spare parts' },
      { name: 'Komatsu',            country: 'Japan',   role: 'Earth-moving and compressor spares' },
      { name: 'Atlas Copco',        country: 'Sweden',  role: 'Compressed air and pneumatic tools' },
      { name: 'McMaster-Carr',      country: 'USA',     role: 'Lifting, lashing and mechanical hardware' }
    ],
    applications: [
      'Civil Defence-approved fire-rated doors, frames and hardware packages for commercial fit-outs',
      'Caterpillar and Komatsu earth-mover spares: filters, gaskets, hoses, hydraulic rebuilds',
      'Compressor spares for Atlas Copco, Ingersoll Rand, Cummins and Waukesha units',
      'Road-safety packages: barriers, cones, delineators, reflective gear and signage',
      'Fall-arrest and PPE kits for high-rise work; lifting and lashing equipment for site logistics'
    ],
    journal: { title: 'Civil Defence fire-door compliance, explained without the paperwork headache', href: '../journal/civil-defence-fire-door-compliance.html' }
  },
  {
    slug: 'hospitality',
    title: 'Hospitality &amp; Corporate Supplier UAE — Office Equipment &amp; Stationery | Goodway',
    desc:  'UAE hotels, corporate offices, schools and service businesses: 20,000+ office equipment and stationery SKUs from 3M, Brother, Avery, Leitz, Fellowes, GBC, PaperOne &mdash; one supplier, consolidated billing.',
    eyebrow: '// Industries · Hospitality &amp; Corporate',
    h1: 'Stationery and office equipment for UAE hotels and corporate offices.',
    lede: 'UAE hotels, corporate headquarters, schools and service businesses procure stationery, print consumables, filing, shredding and meeting-room hardware from Goodway\'s 20,000+ SKU office catalogue &mdash; with consolidated billing, back-to-office recurring orders and same-week replenishment.',
    stats: [
      { num: '20k+', label: 'Office equipment and stationery SKUs across every category' },
      { num: '25+', label: 'Global brands from 3M to Brother, Leitz, Avery, Fellowes, Casio' },
      { num: '1&ndash;3 wk', label: 'Typical delivery window for stocked items' }
    ],
    divisions: ['office-equipment'],
    principals: [
      { name: '3M',       country: 'USA',   role: 'Adhesives, office supplies, safety products' },
      { name: 'Brother',  country: 'Japan', role: 'Printers, multifunction devices, label makers' },
      { name: 'Avery',    country: 'USA',   role: 'Labels, filing, identification' },
      { name: 'Leitz',    country: 'Germany', role: 'Filing, archiving, shredding' },
      { name: 'Fellowes', country: 'USA',   role: 'Shredders, laminators, binding systems' },
      { name: 'PaperOne', country: 'Indonesia', role: 'Office paper, premium reams' }
    ],
    applications: [
      'Back-to-office recurring stationery and print consumables replenishment for corporate HQs',
      'Front-of-house printing, scanning and document handling for hotels and service businesses',
      'Filing, archiving and shredding solutions for HR and finance departments',
      'Meeting-room kits: whiteboards, displays, markers, clickers, laminators',
      'Bulk paper and print media with VAT-compliant invoicing under a blanket PO'
    ]
  },
  {
    slug: 'manufacturing',
    title: 'Manufacturing &amp; Industrial Supplier UAE — Cables, Mechanical Parts &amp; Instrumentation | Goodway',
    desc:  'UAE manufacturing and industrial-plant supply: Lütze industrial cables, McMaster-Carr mechanical parts, compressor spares and process instrumentation &mdash; authorised distribution.',
    eyebrow: '// Industries · Manufacturing &amp; Industrial',
    h1: 'Cables, mechanical parts and instrumentation for UAE manufacturing plants.',
    lede: 'UAE manufacturing plants, process industries and heavy-industrial sites run on reliable cables, mechanical consumables, compressor spares and process measurement. Goodway consolidates Lütze, McMaster-Carr, ATMI, Efftec and more under a single UAE supply channel.',
    stats: [
      { num: 'Lütze', label: 'German industrial cable and wiring system specialist' },
      { num: 'McMC', label: 'McMaster-Carr USA &mdash; industrial hardware catalogue access' },
      { num: '8', label: 'Mechanical product lines: spares, compressors, couplings, flanges, valves, bolts, lifting, safety' }
    ],
    divisions: ['mechanical', 'electrical', 'instrumentation', 'chemicals-power'],
    principals: [
      { name: 'Lütze',          country: 'Germany', role: 'Industrial cables, cable carriers, wiring systems' },
      { name: 'McMaster-Carr',  country: 'USA',     role: 'Industrial hardware, mechanical parts, consumables' },
      { name: 'ATMI',           country: 'France',  role: 'Process instrumentation and level switches' },
      { name: 'Yuasa',          country: 'Japan',   role: 'Sealed lead-acid standby batteries' },
      { name: 'Efftec',         country: 'Australia', role: 'Environmental monitoring for plant emissions' },
      { name: 'Westinghouse',   country: 'USA',     role: 'AC/DC motors for production lines' }
    ],
    applications: [
      'Industrial cables and cable carriers for production line retrofits and expansion',
      'Compressor spares, couplings, flanges, valves and bolts for maintenance shutdowns',
      'Process instrumentation for temperature, pressure, flow and level measurement',
      'Standby battery systems for control rooms and SCADA servers',
      'Environmental monitoring for plant emissions, stack gas and effluent compliance'
    ]
  }
];

/* ----- Shared chrome (nav + footer) used by every industry page ----- */
const NAV = `  <div data-animation="over-right" data-collapse="medium" data-duration="400" role="banner" class="navbar w-nav">
    <div class="container"><div class="navbar-wrap">
      <a href="../index.html" class="logo-brand w-nav-brand"><img src="../images/goodway-logo.png" width="180" alt="Goodway"></a>
      <nav role="navigation" class="nav-menu w-nav-menu"><div class="nav-menu-item">
        <a href="../about.html" class="nav-link w-nav-link">About Us</a>
        <a href="../services.html" class="nav-link w-nav-link">What We Do</a>
        <div data-hover="false" data-delay="0" class="w-dropdown">
          <div class="w-dropdown-toggle"><div class="w-icon-dropdown-toggle"></div><div>Divisions</div></div>
          <nav class="w-dropdown-list">
            <a href="../divisions/scientific-lab.html" class="w-dropdown-link">Scientific &amp; Lab Instrumentation</a>
            <a href="../divisions/mechanical.html" class="w-dropdown-link">Mechanical Items</a>
            <a href="../divisions/electrical.html" class="w-dropdown-link">Electrical</a>
            <a href="../divisions/instrumentation.html" class="w-dropdown-link">Instrumentation</a>
            <a href="../divisions/building-material.html" class="w-dropdown-link">Building Material</a>
            <a href="../divisions/chemicals-power.html" class="w-dropdown-link">Chemicals &amp; Power</a>
            <a href="../divisions/heavy-equipment.html" class="w-dropdown-link">Heavy Equipment &amp; Spares</a>
            <a href="../divisions/road-safety.html" class="w-dropdown-link">Road &amp; Industrial Safety</a>
            <a href="../divisions/office-equipment.html" class="w-dropdown-link">Office Equipment &amp; Stationery</a>
          </nav>
        </div>
        <a href="../principals.html" class="nav-link w-nav-link">Principals &amp; Brands</a>
        <a href="../industries.html" aria-current="page" class="nav-link w-nav-link w--current">Industries</a>
      </div><div class="button-menu"><a href="../contact.html" class="button-outline w-inline-block"><div class="p1-default">Contact Us</div></a></div></nav>
      <div class="menu-button w-nav-button" aria-label="Menu"><div class="menu-icon-line"><div class="menu-line-top"></div><div class="menu-line-middle"></div><div class="menu-line-bottom"></div></div></div>
    </div></div>
  </div>`;

const FOOTER = `  <footer class="footer-section">
    <div class="container">
      <div class="footer-wrap">
        <div class="footer-top">
          <div class="company-info">
            <div class="company-description"><img src="../images/goodway-logo.png" loading="lazy" width="160" alt="Good Way General Trading">
              <div class="paragraph regular-light-grey"><strong>Good Way General Trading</strong> &mdash; a national establishment with international expertise in oil, gas, petrochemical, power and water sectors since 2014.</div>
              <div class="paragraph regular-light-grey">📍 <strong>Head Office:</strong> Abu Dhabi, UAE<br>📮 <strong>P.O. Box:</strong> 10422</div>
            </div>
            <div class="company-socmed">
              <div class="paragraph bold-white">Follow Us</div>
              <div class="footer-socmed">
                <a href="../contact.html" class="socmed-link w-inline-block" aria-label="Contact Goodway on LinkedIn — profile coming soon"><svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" class="icon"><path d="M7.5 9h-4a.5.5 0 00-.5.5v12a.5.5 0 00.5.5h4a.5.5 0 00.5-.5v-12A.5.5 0 007.5 9zM18 9a5.48 5.48 0 00-3 .92V9.5a.5.5 0 00-.5-.5h-4a.5.5 0 00-.5.5v12a.5.5 0 00.5.5h4a.5.5 0 00.5-.5V16a1.5 1.5 0 013 0v5.5a.5.5 0 00.5.5h4a.5.5 0 00.5-.5V14a5 5 0 00-5-5zM5.5 7.5A2.5 2.5 0 105.5 2.5a2.5 2.5 0 000 5z" fill="#C9A961"></path></svg></a>
              </div>
            </div>
          </div>
          <div class="footer-menu">
            <div class="div-block-3">
              <div class="menu-quick-links">
                <div class="paragraph bold-white">Quick Links</div>
                <a href="../about.html" class="footer-link">About</a>
                <a href="../services.html" class="footer-link">What We Do</a>
                <a href="../principals.html" class="footer-link">Principals</a>
                <a href="../industries.html" class="footer-link">Industries</a>
                <a href="../contact.html" class="footer-link">Contact</a>
              </div>
              <div class="footer-contact">
                <div class="paragraph bold-white">Contact</div>
                <div class="footer-contact-item">
                  <div class="contact-footer"><svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" class="icon"><path d="M19 4H5a3 3 0 00-3 3v10a3 3 0 003 3h14a3 3 0 003-3V7a3 3 0 00-3-3zm-.41 2L12.71 11.88a1 1 0 01-1.42 0L5.41 6h13.18z" fill="#DCDCDC"></path></svg>
                    <div class="paragraph regular-gainsboro"><a href="mailto:info@goodway.ae">info@goodway.ae</a></div>
                  </div>
                  <div class="contact-footer"><svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" class="icon"><path d="M19.44 13a9 9 0 01-.7-.12 10 10 0 01-1.28-.39 2 2 0 00-2.63 1l-.22.45a12 12 0 01-2.66-2 12 12 0 01-2-2.66l.42-.28a2 2 0 001-2.63 10 10 0 01-.39-1.28c-.05-.22-.09-.45-.12-.69A3 3 0 008 2H5a3 3 0 00-3 3.45 21 21 0 0018.54 18.55h.38a3 3 0 003-3v-3a3 3 0 00-2.49-2.99z" fill="#DCDCDC"></path></svg>
                    <div class="paragraph regular-gainsboro"><a href="tel:+971564423539">+971 56 442 3539</a> <span class="contact-meta">(mobile)</span><br><a href="tel:+97122450497">+971 2 245 0497</a> <span class="contact-meta">(office)</span> &middot; <a href="https://wa.me/971564423539?text=Hi%20Goodway%2C%20I%20found%20your%20website%20and%20would%20like%20to%20discuss%20a%20supply%20enquiry." rel="noopener" target="_blank">WhatsApp</a></div>
                  </div>
                </div>
              </div>
              <div class="footer-newsletter">
                <div class="paragraph bold-white">Request Catalogue</div>
                <label for="email-2" class="paragraph regular-gainsboro">Receive a PDF of our principals and product divisions.</label>
                <div class="newsletter-form">
                  <form id="email-form" name="email-form" data-name="Email Form" method="get" class="newsletter-form-field"><input class="newsletter-field w-input" maxlength="256" name="email-2" data-name="Email 2" placeholder="Enter your email" type="email" id="email-2" aria-label="Email address for catalogue" required><input type="submit" data-wait="Please wait..." class="newsletter-button w-button" value="Send"></form>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <div class="paragraph regular-gainsboro">&copy; 2026 Good Way General Trading. All Rights Reserved. &middot; Licence No. CN-1843054 &middot; TRN 100464283900003 &middot; <a href="../privacy.html" class="footer-link footer-link--inline">Privacy</a> &middot; <a href="../terms.html" class="footer-link footer-link--inline">Terms</a></div>
          <div class="paragraph regular-gainsboro" lang="ar" dir="rtl">&#1602;&#1608;&#1583;&#1608;&#1575;&#1610; &#1604;&#1604;&#1578;&#1580;&#1575;&#1585;&#1577; &#1575;&#1604;&#1593;&#1575;&#1605;&#1577;</div>
        </div>
      </div>
    </div>
  </footer>
  <script src="../js/goodway-enhance.js" defer></script>`;

function page(s) {
  const canonical = `https://goodway.ae/industries/${s.slug}.html`;
  const og = `https://goodway.ae/assets/images/sections/industries/${s.slug}/hero.png`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${s.title}</title>
  <meta name="description" content="${s.desc}">
  <meta property="og:title" content="${s.title}">
  <meta property="og:description" content="${s.desc}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="canonical" href="${canonical}">
  <link rel="preload" as="image" href="../images/goodway-logo.png" fetchpriority="high">
  <meta property="og:image" content="${og}">
  <link href="../css/normalize.min.css" rel="stylesheet"><link href="../css/webflow.min.css" rel="stylesheet"><link href="../css/green-crescent-consultant.webflow.min.css" rel="stylesheet"><link href="../css/goodway-brand.min.css" rel="stylesheet"><link href="../css/goodway-enhance.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com" rel="preconnect"><link href="https://fonts.gstatic.com" rel="preconnect" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link href="../images/goodway-logo.png" rel="shortcut icon"><link href="../images/goodway-logo.png" rel="apple-touch-icon"><link href="../site.webmanifest" rel="manifest"><meta name="theme-color" content="#0e1a2b"><meta name="robots" content="index,follow"><meta name="twitter:card" content="summary_large_image"><meta property="og:type" content="website">
</head>
<body>
${NAV}

  <nav class="gw-breadcrumb" aria-label="Breadcrumb">
    <ol>
      <li><a href="../index.html">Home</a></li>
      <li><a href="../industries.html">Industries</a></li>
      <li aria-current="page">${s.h1.replace(/<[^>]+>/g, '').replace(/\.$/, '')}</li>
    </ol>
  </nav>

  <main id="main">
  <!-- HERO -->
  <section class="gw-industries-hero">
    <div class="container">
      <div class="gw-industries-hero__eyebrow">${s.eyebrow}</div>
      <h1 class="gw-industries-hero__title">${s.h1}</h1>
      <p class="gw-industries-hero__lede">${s.lede}</p>
      <div class="gw-industries-hero__stats" role="list">
${s.stats.map(x => `        <div class="gw-industries-hero__stat" role="listitem"><strong>${x.num}</strong><span>${x.label}</span></div>`).join('\n')}
      </div>
    </div>
  </section>

  <!-- WHO WE SUPPLY — division subset -->
  <section class="gw-block gw-block--ivory">
    <div class="container">
      <header class="gw-block__header">
        <div class="gw-block__eyebrow">// What we supply</div>
        <h2 class="gw-block__title">Divisions supporting ${s.h1.replace(/<[^>]+>/g, '').toLowerCase().replace(/\.$/, '')}.</h2>
      </header>
      <div class="gw-coverage-grid gw-u-mt-32">
${s.divisions.map(d => `        <article class="gw-coverage-card"><a href="../divisions/${d}.html" style="text-decoration:none;color:inherit"><h3 class="gw-coverage__title">${DIV[d].name}</h3><p class="gw-coverage__body">${DIV[d].blurb}</p><span class="gw-chip-link">See division →</span></a></article>`).join('\n')}
      </div>
    </div>
  </section>

  <!-- PRINCIPALS FOR THIS SECTOR -->
  <section class="gw-block gw-block--navy">
    <div class="container">
      <header class="gw-block__header">
        <div class="gw-block__eyebrow">// Authorised principals</div>
        <h2 class="gw-block__title">The brands that matter in this sector.</h2>
        <p class="gw-block__lede">All principal relationships are direct authorised distribution agreements &mdash; original-equipment quality with documented origin and full manufacturer warranty.</p>
      </header>
      <div class="gw-principals-row">
${s.principals.map(p => `        <div class="gw-principals-row__cell"><div class="gw-principals-row__name">${p.name}</div><div class="gw-principals-row__meta">${p.country}${p.country !== '—' ? ' &middot; ' : ''}${p.role}</div></div>`).join('\n')}
      </div>
    </div>
  </section>

  <!-- TYPICAL APPLICATIONS -->
  <section class="gw-block gw-block--ivory">
    <div class="container">
      <header class="gw-block__header">
        <div class="gw-block__eyebrow">// Typical applications</div>
        <h2 class="gw-block__title">Where we show up on your projects.</h2>
      </header>
      <ul class="gw-apps-list gw-u-mt-32">
${s.applications.map(a => `        <li class="gw-apps-list__item">${a}</li>`).join('\n')}
      </ul>
    </div>
  </section>

${s.journal ? `  <!-- RELATED JOURNAL -->
  <section class="gw-block gw-block--linen">
    <div class="container">
      <header class="gw-block__header">
        <div class="gw-block__eyebrow">// Further reading</div>
        <h2 class="gw-block__title">${s.journal.title}</h2>
        <p><a class="gw-chip-link" href="${s.journal.href}">Read the compliance brief →</a></p>
      </header>
    </div>
  </section>
` : ''}
  <!-- SECTOR CTA -->
  <section class="cta-section"><div class="container"><div class="cta-wrap">
    <div class="cta-content">
      <div class="cta-label">Good Way General Trading</div>
      <h2 class="h1-default">Supply for ${s.h1.replace(/<[^>]+>/g, '').replace(/\.$/, '').replace(/^.*for /, '')}.</h2>
      <div class="cta-description"><div class="h5-default">Share a BOQ or specification. We revert with a VAT-compliant quote, lead time and paperwork bundle within one business day.</div></div>
    </div>
    <a href="../contact.html?sector=${s.slug}#quote" class="main-button-white w-inline-block"><div class="p1-default semibold-white">Request Supply</div></a>
  </div></div></section>

  </main>

${FOOTER}
</body>
</html>
`;
}

let written = 0;
for (const s of sectors) {
  const out = path.join(OUT_DIR, s.slug + '.html');
  fs.writeFileSync(out, page(s));
  written++;
  console.log('  ✓', path.relative(ROOT, out));
}
console.log('\nbuilt', written, 'industry pages');
