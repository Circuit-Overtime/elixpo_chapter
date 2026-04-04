"use client";

import architectureData from "@/data/architecture.json";

const nodeColors: Record<string, string> = {
  "Elixpo Art": "#EC4899",
  "Elixpo Blogs": "#6366F1",
  "LixSearch": "#10B981",
  "Elixpo Chat": "#F59E0B",
  "LixSketch": "#8B5CF6",
  "Elixpo Verse": "#14B8A6",
  "Pollinations API Provider": "#10B981",
  "Elixpo Accounts SSO": "#059669",
  "Elixpo URL": "#0EA5E9",
  "AI/ML Models": "#F97316",
  "Cloud Infra": "#3B82F6",
};

function getColor(name: string) {
  return nodeColors[name] || "#7C3AED";
}

export default function Architecture() {
  const platforms = architectureData.layers[0].items;
  const apis = architectureData.layers[1].items;
  const infra = architectureData.layers[2].items;

  return (
    <section className="py-24 md:py-32 bg-gray-50 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            {architectureData.headline}
          </h2>
          <p className="text-muted max-w-xl mx-auto text-base">
            {architectureData.subheadline}
          </p>
        </div>

        {/* Mermaid-style Graph */}
        <div className="relative">
          {/* Desktop: SVG graph */}
          <div className="hidden md:block">
            <svg viewBox="0 0 900 520" className="w-full h-auto" fill="none">
              {/* Connection lines: platforms → APIs */}
              {platforms.map((_, pi) => {
                const px = 80 + pi * 130;
                return apis.map((_, ai) => {
                  const ax = 200 + ai * 220;
                  return (
                    <line
                      key={`p${pi}-a${ai}`}
                      x1={px + 55} y1={75}
                      x2={ax + 80} y2={235}
                      stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="5 4"
                    />
                  );
                });
              })}

              {/* Connection lines: APIs → Infra */}
              {apis.map((_, ai) => {
                const ax = 200 + ai * 220;
                return infra.map((_, ii) => {
                  const ix = 250 + ii * 300;
                  return (
                    <line
                      key={`a${ai}-i${ii}`}
                      x1={ax + 80} y1={295}
                      x2={ix + 80} y2={425}
                      stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="5 4"
                    />
                  );
                });
              })}

              {/* Arrow markers */}
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#d1d5db" />
                </marker>
              </defs>

              {/* Layer labels */}
              <text x="20" y="30" className="text-[11px] font-semibold uppercase" fill="#7C3AED" letterSpacing="1.5">User-Facing Platforms</text>
              <text x="20" y="250" className="text-[11px] font-semibold uppercase" fill="#10B981" letterSpacing="1.5">API &amp; Core Logic</text>
              <text x="20" y="440" className="text-[11px] font-semibold uppercase" fill="#3B82F6" letterSpacing="1.5">Backend &amp; Infrastructure</text>

              {/* Platform nodes */}
              {platforms.map((name, i) => {
                const x = 80 + i * 130;
                const color = getColor(name);
                return (
                  <g key={name}>
                    <rect x={x} y={45} width={110} height={36} rx={12} fill="white" stroke={color} strokeWidth="2" />
                    <text x={x + 55} y={68} textAnchor="middle" className="text-[11px] font-medium" fill="#374151">{name}</text>
                    <circle cx={x + 55} cy={45} r="4" fill={color} />
                  </g>
                );
              })}

              {/* API nodes */}
              {apis.map((name, i) => {
                const x = 200 + i * 220;
                const color = getColor(name);
                return (
                  <g key={name}>
                    <rect x={x} y={240} width={160} height={50} rx={14} fill="white" stroke={color} strokeWidth="2" />
                    <text x={x + 80} y={270} textAnchor="middle" className="text-[12px] font-semibold" fill="#374151">{name}</text>
                    <circle cx={x + 80} cy={240} r="5" fill={color} />
                  </g>
                );
              })}

              {/* Infra nodes */}
              {infra.map((name, i) => {
                const x = 250 + i * 300;
                const color = getColor(name.split(" (")[0]);
                return (
                  <g key={name}>
                    <rect x={x} y={430} width={180} height={50} rx={14} fill="white" stroke={color} strokeWidth="2" />
                    <text x={x + 90} y={460} textAnchor="middle" className="text-[11px] font-medium" fill="#374151">{name}</text>
                    <circle cx={x + 90} cy={430} r="5" fill={color} />
                  </g>
                );
              })}

              {/* Flow direction indicators */}
              <text x="450" y={185} textAnchor="middle" className="text-[10px]" fill="#9ca3af">requests</text>
              <path d="M450 190 L450 210" stroke="#d1d5db" strokeWidth="1.5" markerEnd="url(#arrowhead)" />

              <text x="450" y={370} textAnchor="middle" className="text-[10px]" fill="#9ca3af">processes</text>
              <path d="M450 375 L450 395" stroke="#d1d5db" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
            </svg>
          </div>

          {/* Mobile: stacked cards */}
          <div className="md:hidden space-y-4">
            {architectureData.layers.map((layer, layerIndex) => (
              <div key={layer.label}>
                <div className="rounded-2xl border-2 bg-white p-5" style={{ borderColor: layer.color }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: layer.color }} />
                    <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: layer.color }}>
                      {layer.label}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {layer.items.map((item) => (
                      <span key={item} className="text-xs px-3 py-1.5 rounded-lg bg-gray-50 border border-border font-medium">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                {layerIndex < architectureData.layers.length - 1 && (
                  <div className="flex justify-center py-1">
                    <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
