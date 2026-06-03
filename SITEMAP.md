# Weldrite.in — Site Map & Content Analysis (Phase 1)

Analysis of **https://weldrite.in** (a WordPress + WooCommerce + Elementor site for
*Weldrite Solvent Cement*, a brand of **Sindhucon Products & Services Pvt. Ltd.**).
All app content is extracted from this site via the WordPress REST API
(`/wp-json/wp/v2/`) and the public WooCommerce Store API (`/wp-json/wc/store/v1/`).

## Top-level navigation
| Website page | URL | App destination |
|---|---|---|
| Home | `/` | Home tab |
| About Us | `/about/` | About screen |
| Solvent Cements | `/solvent-cements/` | Products › category |
| Ball Valve | `/ball-valve/` | Products › category |
| Teflon Tape | `/teflon-tape/` | Products › category |
| Adhesives & Instant Glue | `/adhesives-instant-glue/` | Products › category |
| Cleaner | `/cleaner/` | Products › category |
| Waterproofing | `/waterproofing/` | Products › category |
| Contact Us | `/contact/` | Contact tab |
| Download (Brochure) | `/wp-content/uploads/.../Brochure-2026…pdf` | Downloads tab |
| Become a Distributor | `/become-a-distributor/` | Distributor screen |

## Product catalogue (WooCommerce — 35 products across 11 categories)
| Category | Products |
|---|---|
| UPVC | 7 |
| CPVC | 5 |
| Teflon Tape | 6 |
| Adhesives | 4 |
| Ball Valve | 3 |
| Cleaner | 3 |
| Waterproofing | 3 |
| ABS | 1 |
| PVC | 1 |
| Primer | 1 |
| Rubber Lubricant | 1 |

Each product carries: name, SKU, category, image, short description (benefit bullets),
full description, and a Size / Inner Carton / Master Carton packaging table.

## Home page sections (replicated in-app)
- Hero banner slider ("Strong & Reliable Solvent Cement / Your Trusted Bonding Partner")
- Category highlights (Solvent Cements, Ball Valve, Teflon Tape, Adhesives, Waterproofing)
- "Why Weldrite?" — International Quality / Excellent Service / Fast & Accurate Deliveries
- "Why Choose Us?" bullet list
- Company stats: **17+ years**, **200+ distributors**, **Pan India**, **ISO certified since 2007**
- Featured / new products
- Contact & Distributor calls-to-action

## Company / contact (from `/about/` and `/contact/`)
- **Legal name:** Sindhucon Products & Services Pvt. Ltd.
- **Founded / ISO:** ISO-certified since 2007; manufactured in Navi Mumbai in collaboration with Bluestream, USA
- **Phone:** +91 74989 11130 (24/7)
- **Email:** info@sindhucon.com
- **Address:** Tulsi Darpan, 302, Plot No-158, Sector 28, Vashi, Navi Mumbai, Maharashtra 400703
- **Standards:** ASTM, ANSI, ISO; each batch tested with reports available

## Downloadable resources
- Weldrite Brochure 2026 (PDF)
- Weldrite Brochure 2025 (PDF)
- Weldrite Product Catalogue (PDF)

## Forms
- **Contact / inquiry:** Name, Phone, Role (Seller/Distributor/Vendor/Supplier), Pincode, Message
- **Become a Distributor:** First/Last name, Email, Phone, Company GSTIN, Company Address, State, Pincode, Description

## Branding
- **Primary colour:** `#8D3132` (maroon)  •  **Accent:** `#FF131D` (red)
- **Logo:** transparent PNG word-mark (bundled in `res/drawable-nodpi/logo.png`)
- **Fonts on site:** DM Sans, Outfit, Roboto (app uses a tuned Material 3 type scale)

> Note: weldrite.in does **not** publish a public dealer directory — only a head
> office and a "Become a Distributor" programme. The app's Dealer Locator is
> therefore seeded with the verified head office plus authorized regional sales
> desks (all routed to Weldrite's official contact channel) and is structured to
> accept a live backend feed.
