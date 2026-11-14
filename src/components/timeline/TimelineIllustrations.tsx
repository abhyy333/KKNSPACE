import React from 'react'
import type { TimelineStageIconType } from '@/types/database'

interface IllustrationProps {
  className?: string
  size?: number
}

// -------------------------------------------------------------
// 1. Persiapan: Checklist, Clipboard, and Green Foliage
// -------------------------------------------------------------
export const PersiapanIllustration: React.FC<IllustrationProps> = ({ className = 'w-24 h-24' }) => (
  <svg
    viewBox="0 0 160 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Ilustrasi Persiapan & Pembekalan"
  >
    {/* Soft background glow */}
    <circle cx="80" cy="80" r="68" fill="#F4EFE6" opacity="0.7" />
    
    {/* Decorative green leaves left */}
    <path
      d="M36 94C24 82 28 62 42 56C42 70 38 84 36 94Z"
      fill="#5A7D63"
      stroke="#35513D"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path d="M34 84C38 74 44 68 42 56" stroke="#2B4332" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M30 110C18 102 18 84 32 76C34 88 32 102 30 110Z"
      fill="#7B9E83"
      stroke="#35513D"
      strokeWidth="2"
      strokeLinejoin="round"
    />

    {/* Decorative green leaves right */}
    <path
      d="M124 94C136 82 132 62 118 56C118 70 122 84 124 94Z"
      fill="#5A7D63"
      stroke="#35513D"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path d="M126 84C122 74 116 68 118 56" stroke="#2B4332" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M130 110C142 102 142 84 128 76C126 88 128 102 130 110Z"
      fill="#7B9E83"
      stroke="#35513D"
      strokeWidth="2"
      strokeLinejoin="round"
    />

    {/* Clipboard Base */}
    <rect
      x="46"
      y="38"
      width="68"
      height="94"
      rx="6"
      fill="#C89D66"
      stroke="#6E4A21"
      strokeWidth="3"
    />
    {/* Inner Paper */}
    <rect
      x="52"
      y="48"
      width="56"
      height="76"
      rx="3"
      fill="#FFFFFF"
      stroke="#DCD4C6"
      strokeWidth="1.5"
    />

    {/* Clip at top */}
    <rect x="66" y="32" width="28" height="12" rx="3" fill="#D3B892" stroke="#6E4A21" strokeWidth="2.5" />
    <circle cx="80" cy="38" r="3" fill="#6E4A21" />

    {/* Checklist lines and checkmarks */}
    {/* Row 1 */}
    <circle cx="62" cy="62" r="4.5" fill="#E8F2EA" stroke="#2B5A3C" strokeWidth="1.5" />
    <path d="M60 62L61.5 63.5L64.5 60.5" stroke="#2B5A3C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="72" y1="62" x2="98" y2="62" stroke="#555555" strokeWidth="2.5" strokeLinecap="round" />

    {/* Row 2 */}
    <circle cx="62" cy="76" r="4.5" fill="#E8F2EA" stroke="#2B5A3C" strokeWidth="1.5" />
    <path d="M60 76L61.5 77.5L64.5 74.5" stroke="#2B5A3C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="72" y1="76" x2="94" y2="76" stroke="#555555" strokeWidth="2.5" strokeLinecap="round" />

    {/* Row 3 */}
    <circle cx="62" cy="90" r="4.5" fill="#E8F2EA" stroke="#2B5A3C" strokeWidth="1.5" />
    <path d="M60 90L61.5 91.5L64.5 88.5" stroke="#2B5A3C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="72" y1="90" x2="96" y2="90" stroke="#777777" strokeWidth="2.5" strokeLinecap="round" />

    {/* Row 4 */}
    <circle cx="62" cy="104" r="4.5" fill="#FFF9F0" stroke="#C49B6A" strokeWidth="1.5" />
    <line x1="72" y1="104" x2="90" y2="104" stroke="#999999" strokeWidth="2.5" strokeLinecap="round" />

    {/* Pen / Pencil on side */}
    <g transform="translate(108, 92) rotate(-35)">
      <rect x="0" y="0" width="7" height="34" rx="2" fill="#E08B34" stroke="#7A420D" strokeWidth="1.5" />
      <polygon points="0,34 3.5,41 7,34" fill="#E8CBA3" stroke="#7A420D" strokeWidth="1.5" />
      <polygon points="2,38 3.5,41 5,38" fill="#333333" />
    </g>
  </svg>
)

// -------------------------------------------------------------
// 2. Penerjunan: Sasak Traditional House / Bale Tani & Welcome
// -------------------------------------------------------------
export const PenerjunanIllustration: React.FC<IllustrationProps> = ({ className = 'w-24 h-24' }) => (
  <svg
    viewBox="0 0 160 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Ilustrasi Penerjunan ke Desa"
  >
    {/* Soft background glow */}
    <circle cx="80" cy="80" r="68" fill="#F4EFE6" opacity="0.7" />

    {/* Background trees */}
    <circle cx="44" cy="90" r="14" fill="#6A8E73" opacity="0.8" />
    <circle cx="116" cy="90" r="14" fill="#6A8E73" opacity="0.8" />

    {/* Sasak House (Bale Lumbung / Bale Tani) */}
    {/* Curved thatched roof peak */}
    <path
      d="M80 40C88 48 108 62 120 74C108 76 52 76 40 74C52 62 72 48 80 40Z"
      fill="#A47545"
      stroke="#52351B"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    {/* Roof crown / decorative peak */}
    <path d="M78 35C80 32 82 32 84 35L81 41Z" fill="#52351B" />
    <line x1="68" y1="56" x2="92" y2="56" stroke="#855B31" strokeWidth="2" strokeLinecap="round" />
    <line x1="58" y1="66" x2="102" y2="66" stroke="#855B31" strokeWidth="2" strokeLinecap="round" />

    {/* Main wall / Woven bamboo gedek */}
    <rect x="52" y="74" width="56" height="34" fill="#DEC7A2" stroke="#664627" strokeWidth="2.5" />
    {/* Woven pattern */}
    <line x1="62" y1="74" x2="62" y2="108" stroke="#BF9D6F" strokeWidth="1.5" />
    <line x1="72" y1="74" x2="72" y2="108" stroke="#BF9D6F" strokeWidth="1.5" />
    <line x1="88" y1="74" x2="88" y2="108" stroke="#BF9D6F" strokeWidth="1.5" />
    <line x1="98" y1="74" x2="98" y2="108" stroke="#BF9D6F" strokeWidth="1.5" />

    {/* Wooden Door */}
    <rect x="73" y="82" width="14" height="26" rx="1.5" fill="#75471F" stroke="#482A10" strokeWidth="2" />
    <circle cx="76" cy="95" r="1.5" fill="#DEB887" />

    {/* Wooden pillars / foundation stilt platform */}
    <rect x="46" y="108" width="68" height="6" rx="2" fill="#8B5A2B" stroke="#4A2C11" strokeWidth="2" />
    {/* Stilt footers */}
    <rect x="52" y="114" width="6" height="12" fill="#593717" />
    <rect x="77" y="114" width="6" height="12" fill="#593717" />
    <rect x="102" y="114" width="6" height="12" fill="#593717" />

    {/* Steps leading up */}
    <rect x="71" y="116" width="18" height="3" fill="#D3A772" stroke="#6E441B" strokeWidth="1" />
    <rect x="68" y="120" width="24" height="4" fill="#BA8D59" stroke="#6E441B" strokeWidth="1" />

    {/* Ground foliage & welcome sign */}
    <ellipse cx="44" cy="124" rx="12" ry="4" fill="#5B8064" />
    <ellipse cx="116" cy="124" rx="12" ry="4" fill="#5B8064" />
  </svg>
)

// -------------------------------------------------------------
// 3. Pelaksanaan: KKN Students Gathering at Table (Highlighted Stage)
// -------------------------------------------------------------
export const PelaksanaanIllustration: React.FC<IllustrationProps> = ({ className = 'w-32 h-28' }) => (
  <svg
    viewBox="0 0 200 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Ilustrasi Pelaksanaan Program Kerja Lapangan"
  >
    {/* Background warm aura */}
    <ellipse cx="100" cy="85" rx="85" ry="60" fill="#EAF3EB" opacity="0.9" />

    {/* Table Base */}
    <ellipse cx="100" cy="108" rx="55" ry="18" fill="#C99E6C" stroke="#6A451C" strokeWidth="3" />
    <rect x="94" y="118" width="12" height="24" fill="#8B5D2E" stroke="#523211" strokeWidth="2.5" />
    <ellipse cx="100" cy="142" rx="26" ry="6" fill="#754A1F" />

    {/* Papers & Documents on Table */}
    <rect x="82" y="98" width="22" height="14" rx="1" fill="#FFFFFF" stroke="#BDA88E" strokeWidth="1.5" transform="rotate(-6 82 98)" />
    <line x1="86" y1="103" x2="98" y2="103" stroke="#888888" strokeWidth="1.5" />
    <line x1="86" y1="107" x2="96" y2="107" stroke="#888888" strokeWidth="1.5" />
    {/* Coffee / Tea Mug */}
    <rect x="114" y="102" width="6" height="7" rx="1.5" fill="#FFFFFF" stroke="#333333" strokeWidth="1" />

    {/* ---------------- STUDENT 1 (Far Left, seated, green vest) ---------------- */}
    <g id="student-left">
      {/* Head & Hair */}
      <circle cx="62" cy="64" r="9" fill="#F0C29E" />
      <path d="M53 62C53 54 71 52 71 60C71 64 68 64 68 64" fill="#3D291C" />
      {/* Body / KKN Green Vest */}
      <path
        d="M50 78C50 72 74 72 74 78L71 104C71 104 60 106 53 104Z"
        fill="#2A5C3D"
        stroke="#183D26"
        strokeWidth="2"
      />
      {/* Arm leaning on table */}
      <path d="M68 84L82 101" stroke="#F0C29E" strokeWidth="4.5" strokeLinecap="round" />
      {/* "KKN" badge */}
      <rect x="56" y="82" width="10" height="5" rx="1" fill="#FFFFFF" />
      <text x="57" y="86" fontSize="3.5" fontWeight="bold" fill="#183D26">KKN</text>
    </g>

    {/* ---------------- STUDENT 2 (Center Back, facing table, wearing "KKN" jacket) ---------------- */}
    <g id="student-center">
      {/* Head & Hair */}
      <circle cx="100" cy="58" r="10" fill="#E6B48B" />
      <path d="M90 56C90 47 110 47 110 56C108 59 92 59 90 56Z" fill="#241B15" />
      {/* Green Vest with bold "KKN" text on back */}
      <path
        d="M86 74C86 68 114 68 114 74L111 100C111 100 100 102 89 100Z"
        fill="#265839"
        stroke="#153621"
        strokeWidth="2.5"
      />
      {/* "KKN" large print on back */}
      <text x="94" y="84" fontSize="6.5" fontWeight="bold" fill="#E9F5ED" letterSpacing="0.5">KKN</text>
    </g>

    {/* ---------------- STUDENT 3 (Far Right, female student with jilbab/hijab) ---------------- */}
    <g id="student-right">
      {/* Hijab / Head */}
      <circle cx="138" cy="64" r="10" fill="#D2DEC6" stroke="#879F78" strokeWidth="1.5" />
      <ellipse cx="138" cy="65" rx="7" ry="8" fill="#F4CAAA" />
      <path d="M131 63C132 58 144 58 145 63C145 70 131 70 131 63Z" fill="#D2DEC6" />
      {/* Green Vest / Almamater */}
      <path
        d="M126 78C126 72 150 72 150 78L147 104C147 104 136 106 129 104Z"
        fill="#2A5C3D"
        stroke="#183D26"
        strokeWidth="2"
      />
      {/* Arm gesturing toward document */}
      <path d="M132 84L116 101" stroke="#F4CAAA" strokeWidth="4.5" strokeLinecap="round" />
      {/* "KKN" badge */}
      <rect x="134" y="82" width="10" height="5" rx="1" fill="#FFFFFF" />
      <text x="135" y="86" fontSize="3.5" fontWeight="bold" fill="#183D26">KKN</text>
    </g>
  </svg>
)

// -------------------------------------------------------------
// 4. Monitoring & Evaluasi: Analytics Board, Chart, Magnifying Glass
// -------------------------------------------------------------
export const MonevIllustration: React.FC<IllustrationProps> = ({ className = 'w-24 h-24' }) => (
  <svg
    viewBox="0 0 160 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Ilustrasi Monitoring & Evaluasi"
  >
    {/* Soft background glow */}
    <circle cx="80" cy="80" r="68" fill="#F4EFE6" opacity="0.7" />

    {/* Presentation Board / Stand */}
    <rect x="44" y="42" width="72" height="54" rx="4" fill="#FFFFFF" stroke="#52391F" strokeWidth="2.5" />
    <rect x="48" y="46" width="64" height="46" fill="#FDFBF7" />

    {/* Tripod Stand */}
    <line x1="60" y1="96" x2="48" y2="128" stroke="#684725" strokeWidth="3" strokeLinecap="round" />
    <line x1="100" y1="96" x2="112" y2="128" stroke="#684725" strokeWidth="3" strokeLinecap="round" />
    <line x1="80" y1="96" x2="80" y2="128" stroke="#52391F" strokeWidth="3" strokeLinecap="round" />

    {/* Progress Bars & Chart on Board */}
    {/* Bar 1 */}
    <rect x="54" y="74" width="7" height="14" rx="1" fill="#D4A76A" />
    {/* Bar 2 */}
    <rect x="65" y="66" width="7" height="22" rx="1" fill="#5E8B6C" />
    {/* Bar 3 */}
    <rect x="76" y="58" width="7" height="30" rx="1" fill="#2B5A3C" />
    {/* Bar 4 */}
    <rect x="87" y="52" width="7" height="36" rx="1" fill="#20452D" />

    {/* Upward Line Curve */}
    <path
      d="M56 70C66 64 78 54 94 48"
      stroke="#C05621"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="94" cy="48" r="2.5" fill="#C05621" />

    {/* Magnifying Glass */}
    <g transform="translate(90, 72) rotate(25)">
      {/* Glass Ring */}
      <circle cx="20" cy="20" r="14" fill="#E8F4EC" fillOpacity="0.8" stroke="#254F34" strokeWidth="3" />
      {/* Glare */}
      <path d="M12 16C14 12 18 10 22 10" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      {/* Handle */}
      <rect x="18" y="34" width="5" height="18" rx="2" fill="#8A5A2B" stroke="#482D13" strokeWidth="2" />
    </g>
  </svg>
)

// -------------------------------------------------------------
// 5. Penarikan: Handshake & Green Laurel / Sasak Partnership
// -------------------------------------------------------------
export const PenarikanIllustration: React.FC<IllustrationProps> = ({ className = 'w-24 h-24' }) => (
  <svg
    viewBox="0 0 160 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Ilustrasi Penarikan & Serah Terima"
  >
    {/* Soft background glow */}
    <circle cx="80" cy="80" r="68" fill="#F4EFE6" opacity="0.7" />

    {/* Laurel Leaves Surround (Wreath) */}
    {/* Left wreath */}
    <path
      d="M38 102C26 84 28 58 44 44"
      stroke="#5A7D63"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <path d="M34 94C24 90 28 80 34 82" fill="#5A7D63" stroke="#2B4332" strokeWidth="1.5" />
    <path d="M30 76C20 72 24 62 30 64" fill="#5A7D63" stroke="#2B4332" strokeWidth="1.5" />
    <path d="M38 58C30 50 36 42 42 46" fill="#7B9E83" stroke="#2B4332" strokeWidth="1.5" />

    {/* Right wreath */}
    <path
      d="M122 102C134 84 132 58 116 44"
      stroke="#5A7D63"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <path d="M126 94C136 90 132 80 126 82" fill="#5A7D63" stroke="#2B4332" strokeWidth="1.5" />
    <path d="M130 76C140 72 136 62 130 64" fill="#5A7D63" stroke="#2B4332" strokeWidth="1.5" />
    <path d="M122 58C130 50 124 42 118 46" fill="#7B9E83" stroke="#2B4332" strokeWidth="1.5" />

    {/* Handshake: Left Hand (KKN Student Green Sleeve) */}
    {/* Left Sleeve */}
    <path d="M38 66L54 74L48 98L32 90Z" fill="#285637" stroke="#173922" strokeWidth="2.5" />
    <rect x="52" y="73" width="4" height="24" rx="1" fill="#FFFFFF" transform="rotate(27 52 73)" />
    {/* Left Hand Arm */}
    <path
      d="M54 78L78 84C82 85 86 89 86 94L76 96L66 90L50 86Z"
      fill="#D9A070"
      stroke="#5C3614"
      strokeWidth="2"
      strokeLinejoin="round"
    />

    {/* Handshake: Right Hand (Village Leader / Batik / Warm Ochre Sleeve) */}
    {/* Right Sleeve */}
    <path d="M122 66L106 74L112 98L128 90Z" fill="#A87238" stroke="#5E3812" strokeWidth="2.5" />
    <rect x="104" y="75" width="4" height="24" rx="1" fill="#F4E3C7" transform="rotate(-27 104 75)" />
    {/* Right Hand Arm */}
    <path
      d="M106 78L82 84C78 85 74 89 74 94L84 96L94 90L110 86Z"
      fill="#F0BF94"
      stroke="#5C3614"
      strokeWidth="2"
      strokeLinejoin="round"
    />

    {/* Interlocked Fingers */}
    {/* Thumb Left */}
    <path d="M72 82C74 80 78 80 80 84L82 88L76 88Z" fill="#D9A070" stroke="#5C3614" strokeWidth="1.8" />
    {/* Thumb Right */}
    <path d="M88 82C86 80 82 80 80 84L78 88L84 88Z" fill="#F0BF94" stroke="#5C3614" strokeWidth="1.8" />
    {/* Gripping Fingers Clasp */}
    <path d="M76 88C78 92 82 92 84 88" stroke="#5C3614" strokeWidth="2" strokeLinecap="round" />
    <path d="M78 92C80 95 82 95 84 92" stroke="#5C3614" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

// -------------------------------------------------------------
// 6. Panoramic Village Scenery for Bottom of Roadmap
// -------------------------------------------------------------
export const RoadmapVillageScenery: React.FC<{ className?: string }> = ({ className = 'w-full h-32' }) => (
  <svg
    viewBox="0 0 1200 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    preserveAspectRatio="none"
    aria-label="Pemandangan Pedesaan Pringgasela Selatan"
  >
    {/* Distant soft mountains (Rinjani foothills) */}
    <path
      d="M0 120C120 90 280 75 420 95C560 115 720 85 860 100C1000 115 1120 90 1200 105V180H0V120Z"
      fill="#DCE7DD"
      opacity="0.8"
    />
    <path
      d="M0 135C150 110 320 105 480 120C640 135 800 110 960 125C1080 135 1160 120 1200 130V180H0V135Z"
      fill="#C1D6C4"
      opacity="0.9"
    />

    {/* Rolling Terraced Rice Fields (Sawah) */}
    <path
      d="M0 148C200 130 400 135 600 145C800 155 1000 135 1200 145V180H0V148Z"
      fill="#A8C8AB"
    />
    <path
      d="M0 160C180 150 380 152 560 162C760 172 980 150 1200 160V180H0V160Z"
      fill="#88B08D"
    />

    {/* Terraced ridges lines */}
    <path d="M40 152C160 140 280 142 400 150" stroke="#719A76" strokeWidth="2" strokeLinecap="round" />
    <path d="M450 156C600 164 780 152 900 156" stroke="#719A76" strokeWidth="2" strokeLinecap="round" />
    <path d="M940 150C1040 142 1120 146 1180 152" stroke="#719A76" strokeWidth="2" strokeLinecap="round" />

    {/* Trees Left */}
    <g transform="translate(60, 110)">
      {/* Palm 1 */}
      <path d="M20 50C18 30 16 15 15 0" stroke="#5D4327" strokeWidth="3" strokeLinecap="round" />
      <path d="M15 0C8 -10 -5 -6 -12 2" stroke="#486E4F" strokeWidth="3" strokeLinecap="round" />
      <path d="M15 0C22 -10 35 -6 42 2" stroke="#486E4F" strokeWidth="3" strokeLinecap="round" />
      <path d="M15 0C10 -15 20 -20 15 -25" stroke="#486E4F" strokeWidth="3" strokeLinecap="round" />
      {/* Tree cluster */}
      <circle cx="45" cy="30" r="14" fill="#527859" />
      <circle cx="58" cy="26" r="18" fill="#416348" />
      <circle cx="72" cy="32" r="14" fill="#5E8666" />
    </g>

    {/* Traditional Village House in Middle (Pringgasela Cottage) */}
    <g transform="translate(740, 126)">
      {/* Roof */}
      <polygon points="35,0 0,18 70,18" fill="#A47545" stroke="#4F3318" strokeWidth="2" />
      {/* Body */}
      <rect x="8" y="18" width="54" height="24" fill="#E8D5B7" stroke="#5E3C1A" strokeWidth="2" />
      {/* Door & Window */}
      <rect x="28" y="24" width="12" height="18" fill="#6B411C" />
      <rect x="46" y="24" width="8" height="8" fill="#88A392" stroke="#5E3C1A" strokeWidth="1" />
      {/* Garden Trees beside house */}
      <circle cx="-5" cy="20" r="12" fill="#4B7052" />
      <circle cx="78" cy="22" r="14" fill="#597E60" />
    </g>

    {/* Trees Right */}
    <g transform="translate(1040, 105)">
      {/* Palm 2 */}
      <path d="M40 55C38 35 36 20 35 5" stroke="#5D4327" strokeWidth="3" strokeLinecap="round" />
      <path d="M35 5C28 -5 15 -1 8 7" stroke="#486E4F" strokeWidth="3" strokeLinecap="round" />
      <path d="M35 5C42 -5 55 -1 62 7" stroke="#486E4F" strokeWidth="3" strokeLinecap="round" />
      {/* Round Trees */}
      <circle cx="75" cy="35" r="16" fill="#3D5E44" />
      <circle cx="95" cy="30" r="20" fill="#4D7354" />
      <circle cx="115" cy="36" r="15" fill="#5E8565" />
    </g>
  </svg>
)

// -------------------------------------------------------------
// Helper to render stage illustration by icon_type
// -------------------------------------------------------------
export const StageIllustration: React.FC<{
  type: TimelineStageIconType | string
  className?: string
}> = ({ type, className }) => {
  switch (type) {
    case 'preparation':
      return <PersiapanIllustration className={className} />
    case 'deployment':
      return <PenerjunanIllustration className={className} />
    case 'implementation':
      return <PelaksanaanIllustration className={className} />
    case 'evaluation':
      return <MonevIllustration className={className} />
    case 'withdrawal':
      return <PenarikanIllustration className={className} />
    default:
      return <PelaksanaanIllustration className={className} />
  }
}
