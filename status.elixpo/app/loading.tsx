/**
 * Instant skeleton shown while the root status page fetches live data from
 * Cloudflare. Next streams this fallback immediately (Suspense boundary), then
 * swaps in the real page once discovery + analytics resolve. Plain CSS so it
 * renders with zero client JS.
 */

const C = {
    bg: "#faf9f7",
    card: "#ffffff",
    border: "#e7e5e4",
    bone: "#ece9e6",
};

const shimmer: React.CSSProperties = {
    background: C.bone,
    borderRadius: 8,
    animation: "elxpulse 1.5s ease-in-out infinite",
};

function Bars() {
    return (
        <div style={{ display: "flex", gap: 2, height: 34, marginTop: 12 }}>
            {Array.from({ length: 60 }, (_, i) => (
                <div
                    key={i}
                    style={{
                        flex: 1,
                        borderRadius: 2,
                        background: C.bone,
                        animation: "elxpulse 1.5s ease-in-out infinite",
                        animationDelay: `${(i % 12) * 0.06}s`,
                    }}
                />
            ))}
        </div>
    );
}

function Card() {
    return (
        <div
            style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 20,
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div style={{ ...shimmer, width: 150, height: 16 }} />
                <div style={{ ...shimmer, width: 90, height: 14 }} />
            </div>
            <Bars />
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 10,
                }}
            >
                <div style={{ ...shimmer, width: 70, height: 11 }} />
                <div style={{ ...shimmer, width: 90, height: 11 }} />
                <div style={{ ...shimmer, width: 50, height: 11 }} />
            </div>
        </div>
    );
}

export default function Loading() {
    return (
        <div style={{ minHeight: "100dvh", background: C.bg }}>
            <style>{"@keyframes elxpulse{0%,100%{opacity:1}50%{opacity:.45}}"}</style>
            <div
                style={{
                    maxWidth: 880,
                    margin: "0 auto",
                    padding: "56px 24px",
                }}
            >
                {/* header */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 40,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <div
                            style={{ ...shimmer, width: 30, height: 30, borderRadius: 7 }}
                        />
                        <div style={{ ...shimmer, width: 150, height: 22 }} />
                    </div>
                    <div style={{ ...shimmer, width: 170, height: 40, borderRadius: 8 }} />
                </div>

                {/* banner */}
                <div
                    style={{
                        ...shimmer,
                        height: 84,
                        borderRadius: 10,
                        marginBottom: 40,
                    }}
                />

                {/* services */}
                <div style={{ ...shimmer, width: 80, height: 14, marginBottom: 12 }} />
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                    }}
                >
                    {Array.from({ length: 6 }, (_, i) => (
                        <Card key={i} />
                    ))}
                </div>
            </div>
        </div>
    );
}
