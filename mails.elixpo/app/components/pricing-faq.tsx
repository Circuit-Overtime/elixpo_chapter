"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from "@mui/material";

const TEXT = "#f5f5f4";
const TEXT_65 = "rgba(245,245,244,0.65)";
const BORDER = "rgba(255,255,255,0.07)";

export interface Faq {
    q: string;
    a: string;
}

export default function PricingFaq({ items }: { items: Faq[] }) {
    return (
        <Box>
            {items.map((item, i) => (
                <Accordion
                    key={item.q}
                    disableGutters
                    elevation={0}
                    defaultExpanded={i === 0}
                    sx={{
                        background: "transparent",
                        border: `1px solid ${BORDER}`,
                        borderRadius: "12px !important",
                        mb: 1.5,
                        "&:before": { display: "none" },
                        overflow: "hidden",
                    }}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon sx={{ color: "rgba(245,245,244,0.55)" }} />}
                        sx={{
                            px: 2.5,
                            py: 0.5,
                            "& .MuiAccordionSummary-content": { my: 1.6 },
                        }}
                    >
                        <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: TEXT }}>{item.q}</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                        <Typography sx={{ color: TEXT_65, fontSize: "0.95rem", lineHeight: 1.7 }}>{item.a}</Typography>
                    </AccordionDetails>
                </Accordion>
            ))}
        </Box>
    );
}
