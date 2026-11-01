import json
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

R = json.load(open('numbers.json'))
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 8.5, 'axes.spines.top': False, 'axes.spines.right': False,
                     'axes.edgecolor': '#c3c2b7', 'axes.labelcolor': '#52514e', 'xtick.color': '#898781', 'ytick.color': '#898781',
                     'axes.titlesize': 9.5, 'axes.titleweight': 'bold', 'axes.titlecolor': '#0b0b0b', 'axes.titlelocation': 'left'})
INK, INK2, MUTED, GRID, BASE = '#0b0b0b', '#52514e', '#898781', '#e1e0d9', '#c3c2b7'
CAT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']

def rbar(ax, y, w, h, color, left=0):
    """horizontal bar, 4px-ish rounded at the data end only"""
    ax.barh(y, w, height=h, left=left, color=color, edgecolor='white', linewidth=1.2)

# ---------------- Fig: composition + forecast ----------------
fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.0, 2.7), gridspec_kw=dict(width_ratios=[1.15, 1], wspace=0.55))
comp = sorted(R['comp'].items(), key=lambda kv: kv[1]['tpd'])
names = [k for k, _ in comp]; vals = [v['tpd'] for _, v in comp]; fr = [v['frac'] for _, v in comp]
a1.barh(range(len(vals)), vals, height=0.62, color=CAT[0])
for i, (v, f) in enumerate(zip(vals, fr)):
    a1.text(v + 0.06, i, f'{v:.2f} t  ({f*100:.0f}%)', va='center', fontsize=7.4, color=INK)
a1.set_yticks(range(len(vals))); a1.set_yticklabels(names, fontsize=7.4, color=INK2)
a1.set_xlim(0, 6.2); a1.set_xlabel('tonnes per day')
a1.grid(axis='x', color=GRID, lw=0.6); a1.set_axisbelow(True); a1.tick_params(axis='y', length=0)
a1.set_title(f"(a) Composition of {R['tot_tpd']:.1f} TPD, Ward 44")

yrs = [int(y) for y in R['forecast']]; fc = list(R['forecast'].values())
a2.plot(yrs, fc, color=CAT[0], lw=2)
a2.scatter([yrs[0], yrs[-1]], [fc[0], fc[-1]], s=40, color=CAT[0], edgecolor='white', lw=1.5, zorder=3)
a2.annotate(f'{fc[0]:.1f} TPD\n(2026)', (yrs[0], fc[0]), xytext=(4, 10), textcoords='offset points', fontsize=7.4, color=INK)
a2.annotate(f'{fc[-1]:.1f} TPD\n(2041 design)', (yrs[-1], fc[-1]), xytext=(-62, -4), textcoords='offset points', fontsize=7.4, color=INK)
a2.set_ylim(0, 19); a2.set_xlim(2025.5, 2041.5); a2.set_ylabel('MSW generated (TPD)')
a2.grid(axis='y', color=GRID, lw=0.6); a2.set_axisbelow(True)
a2.set_title('(b) 15-year forecast')
fig.savefig('fig_generation.png', dpi=300, bbox_inches='tight'); plt.close(fig)

# ---------------- Fig: groundwater at Sewapura ----------------
gw = [('Iron', 3.022, 0.3, 'mg/L'), ('Total dissolved solids', 5626, 2000, 'mg/L'), ('Total hardness', 1528, 600, 'mg/L'),
      ('Calcium', 477, 200, 'mg/L'), ('Nitrate', 60.8, 45, 'mg/L'), ('Chloride', 1112, 1000, 'mg/L'),
      ('Manganese', 0.323, 0.3, 'mg/L'), ('Total alkalinity', 644, 600, 'mg/L')]
gw = sorted(gw, key=lambda t: t[1] / t[2])
fig, ax = plt.subplots(figsize=(7.0, 2.6))
ratios = [v / l for _, v, l, _ in gw]
ax.barh(range(len(gw)), ratios, height=0.6, color=CAT[1])
ax.axvline(1, color=INK2, lw=1.2, ls=(0, (4, 3)))
ax.text(1.05, len(gw) - 0.45, 'BIS IS 10500 permissible limit = 1×', fontsize=7.2, color=INK2, va='bottom')
for i, (n, v, l, u) in enumerate(gw):
    ax.text(v / l + 0.12, i, f'{v/l:.1f}×   ({v:g} vs {l:g} {u})', va='center', fontsize=7.4, color=INK)
ax.set_yticks(range(len(gw))); ax.set_yticklabels([g[0] for g in gw], color=INK2); ax.tick_params(axis='y', length=0)
ax.set_xlim(0, 13.5); ax.set_xlabel('measured concentration ÷ permissible limit')
ax.grid(axis='x', color=GRID, lw=0.6); ax.set_axisbelow(True)
ax.set_title('Groundwater in borewells near the Sewapura dumpsite (worst sample per parameter)')
fig.savefig('fig_groundwater.png', dpi=300, bbox_inches='tight'); plt.close(fig)

# ---------------- Fig: mass balance existing vs proposed ----------------
cats = list(R['existing_fate'].keys())
short = {'Composted': 'Composted', 'Recycled (formal + informal)': 'Recycled', 'Inert reused': 'Inert reused',
         'RDF / Waste-to-energy': 'RDF / WtE', 'Dumped / landfilled': 'Dumped / landfilled',
         'Uncollected (littered, burnt, drains)': 'Uncollected: littered, burnt, in drains'}
fig, ax = plt.subplots(figsize=(7.0, 2.35))
rows = [('Existing', R['existing_fate']), ('Proposed', R['proposed_fate'])]
for r, (lab, d) in enumerate(rows):
    left = 0
    for i, c in enumerate(cats):
        v = d[c]
        if v <= 0:
            continue
        ax.barh(1 - r, v, left=left, height=0.55, color=CAT[i], edgecolor='white', linewidth=1.5)
        if v > 0.55:
            ax.text(left + v / 2, 1 - r, f'{v:.1f}', ha='center', va='center', fontsize=7.6, color='white' if i in (0, 5, 6) else INK, weight='bold')
        left += v
ax.set_yticks([1, 0]); ax.set_yticklabels([f"Existing\n(diversion {R['diversion_existing']*100:.0f}%)", f"Proposed\n(diversion {R['diversion_proposed']*100:.0f}%)"], color=INK)
ax.tick_params(axis='y', length=0)
ax.set_xlim(0, R['tot_tpd'] * 1.01); ax.set_xlabel(f"tonnes per day (total {R['tot_tpd']:.1f} TPD)")
ax.grid(axis='x', color=GRID, lw=0.6); ax.set_axisbelow(True)
h = [plt.Rectangle((0, 0), 1, 1, color=CAT[i]) for i in range(len(cats))]
ax.legend(h, [short[c] for c in cats], ncol=3, fontsize=7.2, frameon=False, loc='upper center', bbox_to_anchor=(0.45, -0.32))
ax.set_title('Where each day\'s waste from Ward 44 ends up')
fig.savefig('fig_massbalance.png', dpi=300, bbox_inches='tight'); plt.close(fig)
print('ok')
