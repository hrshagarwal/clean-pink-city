"""Design calculations for the Kardhani (Ward 44) SWM report.
All numbers that appear in the report come from here -> numbers.json."""
import json, math

R = {}
# ---------------- Generation ----------------
HH_2024 = 3135; P_2024 = 15675            # Swachhtam portal 2024, Ward 44
g_pop = 0.028                             # ~2.8 %/yr (Jaipur decadal growth 2001-11 ~32 %)
q = 0.45                                  # kg/cap/day
g_q = 0.0133                              # CPHEEO per-capita growth
nonres = 0.20                             # commercial strip, schools, markets, sweepings
P_2026 = P_2024 * (1 + g_pop) ** 2
HH_2026 = P_2026 / 5
res = P_2026 * q / 1000
tot = res * (1 + nonres)
R.update(P_2024=P_2024, HH_2024=HH_2024, P_2026=P_2026, HH_2026=HH_2026, res_tpd=res, nonres_tpd=res * nonres, tot_tpd=tot)

# city cross-check: NGT 2024 1700 TPD / ~3.9 M people
R['city_q_check'] = 1700e3 / 3.9e6

# 15-year forecast (Ranjan & co. forecasting approach: P and q both grow)
years = list(range(2026, 2042))
fc = [P_2026 * (1 + g_pop) ** (y - 2026) * q * (1 + g_q) ** (y - 2026) * (1 + nonres) / 1000 for y in years]
R['forecast'] = dict(zip(years, fc)); R['P_2041'] = P_2026 * (1 + g_pop) ** 15; R['q_2041'] = q * (1 + g_q) ** 15; R['tot_2041'] = fc[-1]

# ---------------- Composition (CPHEEO / Jaipur case study) ----------------
comp = {'Biodegradable (food, vegetable, garden)': 0.50, 'Inert (dust, sweepings, C&D fines)': 0.25, 'Plastics': 0.09,
        'Paper & cardboard': 0.08, 'Metals & scrap': 0.04, 'Textile, rubber, domestic hazardous': 0.03, 'Glass': 0.01}
R['comp'] = {k: dict(frac=v, tpd=v * tot) for k, v in comp.items()}
wet = 0.50 * tot; inert = 0.25 * tot; dryrec = (0.09 + 0.08 + 0.04 + 0.01) * tot; other = 0.03 * tot
dry_total = tot - wet - inert   # what goes in the household dry bin
R.update(wet=wet, inert=inert, dryrec=dryrec, other=other, dry_hh=dry_total)

# ---------------- Existing fate (estimates) ----------------
uncollected = 0.20 * tot          # ~80 % lifting efficiency (city)
informal = 0.05 * tot             # kabadiwala doorstep sale
collected = tot - uncollected - informal
# collected mixed waste allocated in proportion to citywide capacities (NGT 2024 / 2025 WtE)
wte_share, cmp_share = 1000 / 1700, 250 / 1700
ex = {'Composted': collected * cmp_share * 0.3,  # mixed-waste compost: ~30 % output-useful; rest dumped
      'Recycled (formal + informal)': informal,
      'Inert reused': 0.0,
      'RDF / Waste-to-energy': collected * wte_share,
      'Dumped / landfilled': collected * (1 - wte_share) - collected * cmp_share * 0.3,
      'Uncollected (littered, burnt, drains)': uncollected}
R['existing_fate'] = ex

# ---------------- Proposed fate ----------------
cap_wet, cap_dry, cap_inert = 0.80, 0.70, 0.60
compost_feed = cap_wet * wet
recyc = cap_dry * dryrec
inert_reuse = cap_inert * inert
rdf = (1 - cap_dry) * dryrec + other + (1 - cap_wet) * wet
landfill = (1 - cap_inert) * inert
pr = {'Composted': compost_feed, 'Recycled (formal + informal)': recyc, 'Inert reused': inert_reuse,
      'RDF / Waste-to-energy': rdf, 'Dumped / landfilled': landfill, 'Uncollected (littered, burnt, drains)': 0.0}
R['proposed_fate'] = pr
R['diversion_proposed'] = (compost_feed + recyc + inert_reuse) / tot
R['diversion_existing'] = (ex['Composted'] + ex['Recycled (formal + informal)']) / tot
R['out_of_ward_existing'] = collected
R['out_of_ward_proposed'] = rdf + landfill

# ---------------- Household bins ----------------
kg_hh = 5 * q                     # 5 persons
wet_hh = kg_hh * 0.50; dry_hh = kg_hh * 0.25   # wet & dry bin share (inert mostly sweepings)
V_wet = wet_hh / 300 * 1000 * 2   # L, daily clearance, 300 kg/m3, 100 % freeboard
V_dry = dry_hh * 2 / 100 * 1000 * 1.25  # L, 2-day storage, 100 kg/m3, 25 % freeboard
R.update(kg_hh=kg_hh, wet_hh=wet_hh, dry_hh_kg=dry_hh, V_wet=V_wet, V_dry=V_dry)

# ---------------- Collection fleet (Worrell N = S F / X W) ----------------
shops = 300
S = HH_2026 + shops
wet_per_cust = wet * cap_wet / S * 1000    # kg/customer/day reaching wet compartment
dry_per_cust = (tot - wet - inert) / S * 1000 + (1 - cap_wet) * wet / S * 1000
V_hop_wet, V_hop_dry = 1.2, 1.8   # m3 twin-compartment e-hopper
rho_wet, rho_dry = 400, 130
pay_wet, pay_dry = V_hop_wet * rho_wet, V_hop_dry * rho_dry
cust_per_load = min(pay_wet / wet_per_cust, pay_dry / dry_per_cust)
rate = 3.0     # customers/min (bell-call system: residents bring bins to hopper)
b = cust_per_load / rate
d = 30         # min: drive to ward resource centre (<1.5 km), tip, return
Y, a, e_, f_, g_ = 480, 20, 20, 30, 30
c = (Y - a - e_ - f_ - g_) / (b + d)
X = c * cust_per_load
F, W = 7, 7
N = S * F / (X * W)
R.update(S=S, shops=shops, wet_per_cust=wet_per_cust, dry_per_cust=dry_per_cust, pay_wet=pay_wet, pay_dry=pay_dry,
         cust_per_load=cust_per_load, b=b, d=d, c=c, X=X, N=N, N_prov=math.ceil(N) + 1)

# ---------------- Composting (windrow under shed) ----------------
feed = compost_feed
A_x = 0.5 * (3.0 + 1.0) * 1.5          # m2 trapezoid
rho_c = 500
L_day = feed * 1000 / (A_x * rho_c)
cycle = 30 + 15                         # active + curing (Worrell >= 14 d minimum)
L_tot = L_day * cycle
rows = 4
row_len = L_tot / rows
pad = rows * 5.0 * (row_len + 6)       # 5 m pitch, 3 m turning at each end
site = pad * 1.6
R.update(compost_feed=feed, A_x=A_x, L_day=L_day, cycle=cycle, L_tot=L_tot, row_len=row_len, pad=pad, site=site,
         compost_out=feed * 0.30, compost_yr=feed * 0.30 * 365)

# leaves needed to lift C/N toward 25:1 (Worrell): food waste C/N ~15, dry leaves ~50 (typical)
# mass balance (equal C,N content basis simplified): x leaves per kg food -> (15 + 50 x)/(1 + x) = 25
x = (25 - 15) / (50 - 25)
R['leaf_ratio'] = x; R['leaf_tpd'] = x * feed

# ---------------- Dry Waste Collection Centre ----------------
R['dwcc_tpd'] = recyc
R['dwcc_area'] = 150 + recyc * 100     # m2 (CPHEEO-style ~ 100 m2 per TPD + storage)

# ---------------- Transport savings ----------------
haul_km = 21.0
R['tkm_existing'] = collected * haul_km
R['tkm_proposed'] = (rdf + landfill) * haul_km

# ---------------- Economics (indicative, Rs lakh) ----------------
capex = {'Twin-compartment e-hoppers (6 x 4.5 L)': 6 * 4.5,
         'Household 3-bin sets (3,310 x Rs 250)': HH_2026 * 250 / 1e5,
         'Covered compost shed, 0.1 ha (incl. shredder, sieve)': 30.0,
         'Dry Waste Collection Centre (baler, weighing)': 15.0,
         'Twin litter bins, main road & markets (10 x Rs 12,000)': 1.2,
         'Drain mesh screens (20 x Rs 8,000)': 1.6,
         'IEC, app & AI dash-cams on hoppers': 6.0}
R['capex'] = capex; R['capex_tot'] = sum(capex.values())
benef = {'Compost sale (Rs 3,000/t)': R['compost_yr'] * 3000 / 1e5,
         'Market Development Assistance (Rs 1,500/t)': R['compost_yr'] * 1500 / 1e5,
         'Recyclables (avg Rs 8/kg)': recyc * 365 * 8000 / 1e5,
         'Avoided haul (Rs 12 per t-km)': (R['tkm_existing'] - R['tkm_proposed']) * 365 * 12 / 1e5,
         'User charge (Rs 50/HH/month, 80 % compliance)': HH_2026 * 50 * 12 * 0.8 / 1e5}
R['benefit'] = benef; R['benefit_tot'] = sum(benef.values())
R['opex'] = 32.0   # staff (12 workers incl. DWCC), power, maintenance
R['net'] = R['benefit_tot'] - R['opex']
R['payback'] = R['capex_tot'] / R['net']

json.dump(R, open('numbers.json', 'w'), indent=1, default=float)
for k, v in R.items():
    if not isinstance(v, dict):
        print(f'{k:24s} {v:,.3f}' if isinstance(v, float) else f'{k:24s} {v}')
for k in ['existing_fate', 'proposed_fate', 'capex', 'benefit']:
    print(k); [print(f'   {a:50s} {b:8.2f}') for a, b in R[k].items()]
