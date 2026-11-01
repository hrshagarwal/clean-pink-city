"""GIS analysis of Kardhani street network (OSM) -> maps + routing statistics."""
import json, itertools
import numpy as np, networkx as nx, osmnx as ox, geopandas as gpd
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Patch
from shapely.geometry import Point

plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 9, 'axes.edgecolor': '#c3c2b7'})
INK, INK2, MUTED, GRID = '#0b0b0b', '#52514e', '#898781', '#e1e0d9'
COL = ['#2a78d6', '#eb6834', '#1baf7a', '#4a3aa7']
CRS = 32643
C = (26.9525358, 75.7104088)       # Kardhani (Nominatim)
RADIUS = 650                       # m, study area approximating Ward 44

G = ox.load_graphml('kardhani.graphml')
Gp = ox.project_graph(G, to_crs=CRS)
nodes, edges = ox.graph_to_gdfs(Gp)
centre = gpd.GeoSeries([Point(C[1], C[0])], crs=4326).to_crs(CRS).iloc[0]
area = centre.buffer(RADIUS)
amen = gpd.read_file('amen.gpkg').to_crs(CRS)
amen['geometry'] = amen.geometry.representative_point()

# ---- sub-network inside study area (undirected, for street-length & postman) ----
U = ox.convert.to_undirected(Gp)
keep = [n for n, d in U.nodes(data=True) if area.contains(Point(d['x'], d['y']))]
S = U.subgraph(keep).copy()
S = S.subgraph(max(nx.connected_components(S), key=len)).copy()
L_streets = sum(d['length'] for *_, d in S.edges(data=True)) / 1000
odd = [n for n, k in S.degree() if k % 2 == 1]

# Chinese postman deadhead: greedy min-weight pairing of odd nodes on shortest paths
sp = {}
for n in odd:
    dist = nx.single_source_dijkstra_path_length(S, n, weight='length')
    sp[n] = {m: dist[m] for m in odd if m != n and m in dist}
pairs = sorted(((sp[a][b], a, b) for a, b in itertools.combinations(odd, 2) if b in sp[a]))
used, dead = set(), 0.0
for w, a, b in pairs:
    if a in used or b in used:
        continue
    used |= {a, b}; dead += w
dead /= 1000

# ---- beats: k-means on edge midpoints weighted by length (5 working hoppers) ----
K = 5
mid = []; wts = []; elist = []
for u, v, d in S.edges(data=True):
    mid.append(((S.nodes[u]['x'] + S.nodes[v]['x']) / 2, (S.nodes[u]['y'] + S.nodes[v]['y']) / 2))
    wts.append(d['length']); elist.append((u, v))
mid = np.array(mid); wts = np.array(wts)
# Balanced network-Voronoi: each street segment goes to the seed nearest by
# road distance (+ an additive weight per seed); weights are tuned until beat
# lengths balance, then seeds move to their beat's network medoid. Beats are
# therefore contiguous along the street graph (Worrell routing rule 1).
nl = list(S.nodes)
xy = np.array([(S.nodes[n]['x'], S.nodes[n]['y']) for n in nl])
ang = np.linspace(0, 2 * np.pi, K, endpoint=False)
ctr = np.array([centre.x, centre.y])
seeds = [nl[int(((xy - (ctr + 380 * np.array([np.cos(t), np.sin(t)]))) ** 2).sum(1).argmin())] for t in ang]
D = {}
def dist_from(s):
    if s not in D:
        D[s] = nx.single_source_dijkstra_path_length(S, s, weight='length')
    return D[s]
mid_node = [(u, v) for u, v in elist]
for outer in range(12):
    off = np.zeros(K)
    for inner in range(300):
        dm = np.array([[min(dist_from(s)[u], dist_from(s)[v]) + off[k] for k, s in enumerate(seeds)] for u, v in mid_node])
        lab = dm.argmin(1)
        load = np.array([wts[lab == k].sum() for k in range(K)])
        if load.max() / load.mean() < 1.06:
            break
        off += 40 * (load / load.mean() - 1)
    new = []
    for k in range(K):
        nk = list({n for (u, v), l in zip(elist, lab) if l == k for n in (u, v)})
        sub = S.subgraph(nk)
        comp = max(nx.connected_components(sub), key=len)
        sample = list(comp)[:: max(1, len(comp) // 60)]
        new.append(min(sample, key=lambda c: sum(dist_from(c).get(m, 1e9) for m in comp)))
    if new == seeds:
        break
    seeds = new
cent = np.array([np.average(mid[lab == k], axis=0, weights=wts[lab == k]) for k in range(K)])
beat_len = [wts[lab == k].sum() / 1000 for k in range(K)]
# adjacency of beats for 4-colouring
adj = nx.Graph(); adj.add_nodes_from(range(K))
node_beats = {}
for (u, v), k in zip(elist, lab):
    for n in (u, v):
        node_beats.setdefault(n, set()).add(k)
for bs in node_beats.values():
    for a, b in itertools.combinations(bs, 2):
        adj.add_edge(a, b)
# explicit colouring using 4 validated colours: assign least-used colour not used by neighbours
colour = {}
use = [0, 0, 0, 0]
for k in sorted(adj.nodes, key=lambda n: -adj.degree(n)):
    ok = [c for c in range(4) if all(colour.get(m) != c for m in adj.neighbors(k))]
    c = min(ok, key=lambda c: use[c]); colour[k] = c; use[c] += 1
colour[4] = 3  # B5 visually touches B2 at the diagonal; violet is free (B3 is remote)
print('adjacency', sorted(adj.edges))
assert max(colour.values()) < 4

# ---- facilities ----
def find(name):
    m = amen[amen['name'].fillna('').str.contains(name, case=False)]
    return m.geometry.iloc[0] if len(m) else None
park = gpd.read_file('amen.gpkg').to_crs(CRS)
park_poly = park[park['name'].fillna('').str.contains('Kardhani Central Park', case=False)]
hosp = amen[amen['amenity'].isin(['hospital', 'clinic', 'doctors', 'dentist']) & amen.within(area)]
schools = amen[(amen['amenity'] == 'school') | amen['name'].fillna('').str.contains('SCHOOL', case=True)]
schools = schools[schools.within(area)]
bulk = [('DMart', 'DMart'), ('Govindam Tower', 'GOVINDAM TOWER'), ("Mayfair's Heights", 'Mayfair'),
        ('Narayan Market', 'Narayan Market'), ('LN Plaza', 'LN Plaza')]
land = [('Kardhani Police Stn.', 'Kardhani Police'), ('Govindpura Bus Stand', 'GOVINDPURA MAIN BUS'),
        ('Ravan Gate', 'RAVAN GATE BUS')]
wrc = park_poly.geometry.iloc[0].representative_point() if len(park_poly) else centre

# main-road litter-bin points every ~150 m on tertiary/primary roads inside area
edges_u = ox.graph_to_gdfs(ox.convert.to_undirected(Gp), nodes=False)
main = edges_u[edges_u['highway'].astype(str).str.contains('primary|tertiary') & edges.intersects(area)]
mline = main.geometry.union_all().intersection(area)
bins = []
for g in getattr(mline, 'geoms', [mline]):
    for s in np.arange(0, g.length, 20):
        p = g.interpolate(s)
        if all(p.distance(q) > 145 for q in bins):
            bins.append(p)
stats = dict(radius=RADIUS, area_km2=area.area / 1e6, L_streets=L_streets, n_nodes=S.number_of_nodes(),
             n_edges=S.number_of_edges(), n_odd=len(odd), deadhead=dead, route_len=L_streets + dead,
             efficiency=L_streets / (L_streets + dead), beat_len=beat_len, n_bins=len(bins),
             n_hosp=int(len(hosp)), n_schools=int(len(schools)))
json.dump(stats, open('gis_stats.json', 'w'), indent=1)
print(json.dumps(stats, indent=1))

xmin, ymin, xmax, ymax = area.buffer(80).bounds
def base(ax):
    edges.plot(ax=ax, color='#d9d8d2', linewidth=0.5, zorder=1)
    gpd.GeoSeries([area]).boundary.plot(ax=ax, color=INK2, linewidth=1.0, linestyle=(0, (4, 3)), zorder=5)
    if len(park_poly):
        park_poly.plot(ax=ax, color='#d4ecd4', edgecolor='#7fb77f', linewidth=0.6, zorder=2)
    ax.set_xlim(xmin, xmax); ax.set_ylim(ymin, ymax); ax.set_aspect('equal'); ax.set_xticks([]); ax.set_yticks([]); ax.set_xlabel(''); ax.set_ylabel('')
    # scale bar + north arrow
    x0, y0 = xmin + 60, ymin + 60
    ax.plot([x0, x0 + 250], [y0, y0], color=INK, lw=2.5, solid_capstyle='butt', zorder=9)
    ax.text(x0 + 125, y0 + 22, '250 m', ha='center', fontsize=7.5, color=INK, zorder=9)
    ax.annotate('N', xy=(xmax - 70, ymax - 60), xytext=(xmax - 70, ymax - 170), ha='center', fontsize=10, weight='bold',
                arrowprops=dict(arrowstyle='-|>', color=INK, lw=1.4), color=INK, zorder=9)
    for s in ax.spines.values():
        s.set_edgecolor('#c3c2b7')

def label(ax, p, txt, dx=12, dy=12, **kw):
    ax.annotate(txt, xy=(p.x, p.y), xytext=(p.x + dx, p.y + dy), fontsize=7, color=INK, zorder=12,
                bbox=dict(boxstyle='round,pad=0.18', fc='white', ec='none', alpha=0.85), **kw)

# ---------------- Fig A: existing study area map ----------------
fig, ax = plt.subplots(figsize=(6.3, 6.9))
base(ax)
S_edges = ox.graph_to_gdfs(S, nodes=False)
S_edges.plot(ax=ax, color='#9a9890', linewidth=0.8, zorder=2)
main.plot(ax=ax, color=INK2, linewidth=2.0, zorder=3)
ax.scatter(hosp.geometry.x, hosp.geometry.y, marker='P', s=46, color='#d03b3b', edgecolor='white', lw=0.6, zorder=8)
ax.scatter(schools.geometry.x, schools.geometry.y, marker='s', s=34, color='#2a78d6', edgecolor='white', lw=0.6, zorder=8)
for t, k in bulk:
    p = find(k)
    if p is not None and area.contains(p):
        ax.scatter(p.x, p.y, marker='D', s=40, color='#eda100', edgecolor=INK, lw=0.5, zorder=9); label(ax, p, t)
for t, k in land:
    p = find(k)
    if p is not None:
        ax.scatter(p.x, p.y, marker='o', s=30, color=INK, zorder=9); label(ax, p, t, dx=14, dy=-30)
if len(park_poly):
    label(ax, wrc, 'Kardhani Central Park', dx=-120, dy=40)
h = [Line2D([], [], color=INK2, lw=2, label='Kalwar Road (main road, commercial strip)'),
     Line2D([], [], color='#9a9890', lw=0.8, label=f'Street network in study area ({L_streets:.1f} km)'),
     Line2D([], [], color=INK2, lw=1, ls=(0, (4, 3)), label=f'Study area, r = {RADIUS} m (~Ward 44)'),
     Line2D([], [], marker='P', color='w', markerfacecolor='#d03b3b', markersize=8, label=f'Hospitals / clinics ({len(hosp)}) - biomedical waste'),
     Line2D([], [], marker='D', color='w', markerfacecolor='#eda100', markeredgecolor=INK, markersize=7, label='Bulk / commercial generators')]
ax.legend(handles=h, loc='upper center', bbox_to_anchor=(0.5, -0.01), ncol=2, fontsize=6.8, frameon=False, columnspacing=1.2)
ax.set_xlabel(''); ax.set_ylabel(''); fig.tight_layout(); fig.savefig('fig_map_existing.png', dpi=300); plt.close(fig)

# ---------------- Fig B: proposed plan ----------------
fig, ax = plt.subplots(figsize=(6.3, 6.9))
base(ax)
for k in range(K):
    sel = [i for i in range(len(elist)) if lab[i] == k]
    sub = S.edge_subgraph([(elist[i][0], elist[i][1], 0) for i in sel]) if isinstance(S, nx.MultiGraph) else None
for (u, v), k in zip(elist, lab):
    xs = [S.nodes[u]['x'], S.nodes[v]['x']]; ys = [S.nodes[u]['y'], S.nodes[v]['y']]
    ax.plot(xs, ys, color=COL[colour[k]], lw=1.6, solid_capstyle='round', zorder=3)
for k in range(K):
    ax.text(cent[k][0], cent[k][1], f'B{k+1}\n{beat_len[k]:.1f} km', ha='center', va='center', fontsize=8, weight='bold', color=INK,
            zorder=11, bbox=dict(boxstyle='round,pad=0.3', fc='white', ec=COL[colour[k]], lw=1.6))
bx = [p.x for p in bins]; by = [p.y for p in bins]
ax.scatter(bx, by, marker='o', s=16, color='white', edgecolor=INK, lw=0.9, zorder=8)
ax.scatter([wrc.x], [wrc.y], marker='*', s=320, color='#eda100', edgecolor=INK, lw=0.8, zorder=12)
label(ax, wrc, 'Ward Resource Centre\n(compost shed + DWCC)', dx=-170, dy=55)
ax.scatter(hosp.geometry.x, hosp.geometry.y, marker='P', s=36, color='#d03b3b', edgecolor='white', lw=0.6, zorder=8)
h = [Patch(color=c, label=None) for c in COL]
h = [Line2D([], [], color=COL[colour[k]], lw=2.2, label=f'Beat B{k+1}: {beat_len[k]:.1f} km of street') for k in range(K)]
h += [Line2D([], [], marker='*', color='w', markerfacecolor='#eda100', markeredgecolor=INK, markersize=13, label='Ward Resource Centre (candidate site)'),
      Line2D([], [], marker='o', color='w', markerfacecolor='white', markeredgecolor=INK, markersize=6, label=f'Twin litter bins on main roads ({len(bins)} @ 150 m)'),
      Line2D([], [], marker='P', color='w', markerfacecolor='#d03b3b', markersize=8, label='Biomedical pick-up (CBWTF, not MSW)')]
ax.legend(handles=h, loc='upper center', bbox_to_anchor=(0.5, -0.01), ncol=2, fontsize=6.8, frameon=False, columnspacing=1.2)
ax.set_xlabel(''); ax.set_ylabel(''); fig.tight_layout(); fig.savefig('fig_map_proposed.png', dpi=300); plt.close(fig)
print('beat colours', colour)
