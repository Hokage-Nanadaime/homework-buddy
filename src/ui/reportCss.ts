/** Styles of the progress report, used by the page and by the saved HTML file. Tokens only; charts follow the design's accessible palette. */
export const reportCss = `
.rep { display: grid; gap: 28px; }
.rep h1 { font-size: clamp(28px, 5vw, 40px); }
.rep h2 { font-size: 24px; display: flex; gap: 10px; align-items: baseline; }
.rep h2 .nm { font: 700 14px var(--body); border: 2px solid var(--ink); border-radius: 50%; width: 28px; height: 28px; display: inline-grid; place-items: center; flex: none; }
.rep h3 { font-size: 17px; margin-bottom: 6px; }
.rep .meta { display: flex; flex-wrap: wrap; gap: 4px 20px; margin-top: 6px; }
.rep .sec { display: grid; gap: 12px; padding-top: 16px; border-top: 2px solid var(--line2); }
.rep .lede { color: var(--ink2); }
.rep .callout { border: 2px dashed var(--line-strong); border-radius: 14px; padding: 12px 16px; background: var(--card2); }
.rep .tbl { display: none; overflow-x: auto; }
.rep.tables-on .viz, .rep.tables-on .tl-chart { display: none; }
.rep.tables-on .tbl, .rep.show-both .tbl { display: block; }
.rep table.t { border-collapse: collapse; width: 100%; font-size: 16px; }
.rep table.t th, .rep table.t td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line2); }
.rep table.t thead th { font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.rep .num { font-variant-numeric: tabular-nums; }
.rep .cmp-r { display: grid; grid-template-columns: 90px minmax(0, 1fr) 150px; gap: 12px; align-items: center; padding: 8px 0; }
.rep .track { position: relative; height: 28px; }
.rep .track::before { content: ''; position: absolute; left: 0; right: 0; top: 13px; height: 2px; background: var(--grid); }
.rep .track .sg { position: absolute; top: 11px; height: 6px; border-radius: 3px; background: var(--c); }
.rep .track .d { position: absolute; top: 5px; width: 18px; height: 18px; margin-left: -9px; border-radius: 50%; border: 3px solid var(--c); background: var(--card); }
.rep .track .d.now { background: var(--c); }
.rep .cmp-r.c1 { --c: var(--s1); } .rep .cmp-r.c2 { --c: var(--s2); } .rep .cmp-r.c4 { --c: var(--accent); }
.rep .axisrow { display: grid; grid-template-columns: 90px minmax(0, 1fr) 150px; gap: 12px; font-size: 13px; color: var(--muted); }
.rep .axisrow div { display: flex; justify-content: space-between; }
.rep svg.ax { width: 100%; max-width: 620px; height: auto; display: block; overflow: visible; }
.rep svg.ax text { font: 15px var(--body); fill: var(--muted); }
.rep svg.ax .gl { stroke: var(--grid); stroke-width: 1; }
.rep svg.ax .al { stroke: var(--axis); stroke-width: 1.5; }
.rep svg.ax .ln { fill: none; stroke-width: 3; stroke-linejoin: round; stroke-linecap: round; }
.rep svg.ax .ln.c1, .rep .legend2 .ln.c1 { stroke: var(--s1); } .rep svg.ax .ln.c2, .rep .legend2 .ln.c2 { stroke: var(--s2); } .rep svg.ax .ln.c3, .rep .legend2 .ln.c3 { stroke: var(--s3); }
.rep svg.ax .mkr.c1, .rep .legend2 .mkr.c1 { fill: var(--s1); } .rep svg.ax .mkr.c2, .rep .legend2 .mkr.c2 { fill: var(--s2); } .rep svg.ax .mkr.c3, .rep .legend2 .mkr.c3 { fill: var(--s3); }
.rep svg.ax .lb { fill: var(--ink); font-weight: 700; }
.rep svg.ax .lbv { fill: var(--ink); font-weight: 700; }
.rep .legend2 { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 15px; margin-bottom: 4px; }
.rep .legend2 span { display: inline-flex; gap: 6px; align-items: center; }
.rep .legend2 svg { width: 30px; height: 14px; }
.rep .legend2 .ln { fill: none; stroke-width: 3; }
.rep .notes { display: grid; gap: 8px; }
.rep .notes p { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.rep .pill2 { font-size: 13px; font-weight: 700; border: 1.5px solid var(--ink); border-radius: 999px; padding: 0 10px; white-space: nowrap; }
.rep .legend3 { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 14px; }
.rep .legend3 .sw { display: inline-flex; gap: 6px; align-items: center; }
.rep .legend3 i, .rep .hc { border: 1.5px solid var(--ink); }
.rep .legend3 i { display: inline-block; width: 16px; height: 16px; border-radius: 4px; }
.rep .hm { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
.rep .hbook { grid-column: 1 / -1; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); font-weight: 700; padding-top: 6px; }
.rep .hc { border-radius: 10px; padding: 8px 10px; display: grid; gap: 2px; min-height: 76px; }
.rep .hc small { font-size: 13px; line-height: 1.2; }
.rep .hc b { font: 500 22px var(--display); }
.rep .hc em { font-style: normal; font-size: 13px; font-weight: 700; }
.rep .b5 { background: var(--h5); color: var(--h5t); } .rep .b4 { background: var(--h4); color: var(--h4t); } .rep .b3 { background: var(--h3); color: var(--h3t); }
.rep .b2 { background: var(--h2); color: var(--h2t); } .rep .b1 { background: var(--h1); color: var(--h1t); } .rep .b0 { background: var(--hnone); color: var(--ink); border-style: dashed; }
.rep .lvrow { display: grid; grid-template-columns: 150px minmax(0, 1fr) minmax(0, 1.2fr); gap: 12px; align-items: center; }
.rep .bar { height: 14px; border-radius: 999px; background: var(--track); border: 1px solid var(--line); overflow: hidden; }
.rep .bar i { display: block; height: 100%; background: var(--accent); }
.rep .tiles { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
.rep .tile { border: 2px solid var(--line); border-radius: 14px; padding: 12px 16px; background: var(--card); }
.rep .tile b { display: block; font: 500 32px var(--display); }
.rep .cols { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.rep .exbig { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); align-items: start; }
.rep .ready { font: 500 28px var(--display); }
.rep ol.nx { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.rep ol.nx li { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; border: 2px solid var(--line); border-radius: 14px; padding: 10px 14px; background: var(--card); }
.rep ol.nx .no { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--ink); display: inline-grid; place-items: center; font-weight: 700; flex: none; }
.rep ol.nx .tx { flex: 1; min-width: 200px; }
.rep .pipline { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
.rep .pipline svg.pip { width: 90px; }
.rep .foot { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; color: var(--muted); font-size: 14px; border-top: 2px solid var(--line2); padding-top: 12px; }
.rep-bar { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; justify-content: space-between; }
@media (max-width: 640px) { .rep .lvrow { grid-template-columns: 1fr !important; gap: 4px; } .rep .cmp-r, .rep .axisrow { grid-template-columns: 1fr; } .rep .axisrow > span { display: none; } }
`;
