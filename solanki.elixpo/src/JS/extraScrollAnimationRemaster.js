const blocks_to_be_animated = [".wandOne", "#particleWandEffect", ".wandparticleBackdropCut", ".wandparticleBackdrop", ".visuMagicContainer .FirstRowFirstLayout", 
                        ".visuMagicContainer .FirstRowMiddleLayout", ".visuMagicContainer .SecondRowFirstLayout",
                        ".visuMagicContainer .SecondRowSecondLayout",".visuMagicContainer .ThirdRowFirstLayout", ".visuMagicContainer .ThirdRowMiddleLayout"
                        ,"#innoVistaLogo","#innoVista", "#innoVistaDesc", "#redirectSocialInnoVista", 
                        "#FirstRowFirstLayoutInnovate", "#FirstRowSecondLayoutInnovate","#SecondRowSecondLayoutInnovate",".autoEditaLogoMask",
                         ".autoEditaText", ".galleryImagesAutoEditaBtn", ".socialSectionAutoEditaBtn", ".autoEditaDesc", ".redirectSocialautoEdita", 
                         "#FirstRowFirstLayoutEdita", "#FirstRowSecondLayoutEdita", ".designSageLogo", ".designSageText",
                         ".designSageDesc", ".redirectSocialdesignSage"]

//".visuMagicContainer .FirstRowThirdLayout"
//".visuMagicContainer .ThirdRowThirdLayout"

function AnimateOnScroll(parentElement, targetElement, animationParameters,elm_trig_thresh)
{  
        elm_trig_thresh = elm_trig_thresh || 5
        disableParameters(targetElement, animationParameters);
        var elm_top = document.querySelector(targetElement).getBoundingClientRect().y - window.innerHeight;
        document.getElementById(parentElement).addEventListener("scroll", () => {
            if(elm_top > 0)
            {
                elm_appear_trigger_threshold = elm_top - elm_trig_thresh;
                if(document.getElementById(parentElement).scrollTop >= elm_appear_trigger_threshold)
                {
                    animateElement(targetElement, animationParameters);
                    const index_to_remove = blocks_to_be_animated.indexOf(targetElement);
                    blocks_to_be_animated.splice(index_to_remove);
                }
            }
        })
    
}
function disableParameters(targetElement, animationParameters)
{
    
    var targetElementLcl = document.querySelector(targetElement);
    targetElementLcl.style.transition = [animationParameters.transition];
    targetElementLcl.style[animationParameters.type]  = (animationParameters.type_value.split("***")[0]); 
    targetElementLcl.style.opacity = [animationParameters.initial_opacity.split(" ")[0]];
    targetElementLcl.style.scale = [animationParameters.scale_value ? animationParameters.scale_value.split(" ")[0] : null];
}

function animateElement(targetElement, animationParameters)
{
    setTimeout(() => {
    var targetElementLcl = document.querySelector(targetElement);
    targetElementLcl.style.transition = [animationParameters.transition];
    targetElementLcl.style[animationParameters.type]  = (animationParameters.type_value.split("***")[1]); 
    targetElementLcl.style.opacity = [animationParameters.initial_opacity.split(" ")[1]];
    targetElementLcl.style.scale = [animationParameters.scale_value ? animationParameters.scale_value.split(" ")[1] : null];
}, animationParameters.delay);
}


document.getElementById("mainContainer").addEventListener("scroll", () => {
    blocks_to_be_animated.forEach(element => {
        if(element == ".wandOne")
        {
            AnimateOnScroll("mainContainer", ".wandOne", 
            {
                type : "transform",
                type_value : "translateX(250px) *** translateX(0px)",
                transition : "1s",
                initial_opacity : "0 1",
                delay : 400,
            },elm_trig_thresh = 150
            )
        }
        else if( element == "#particleWandEffect")
        {
            AnimateOnScroll("mainContainer", "#particleWandEffect", 
            {
                type : "transform",
                type_value : "translateX(-50%) translateY(250px) *** translateX(-50%) translateY(0px)",
                transition : "0.5s",
                initial_opacity : "0 1",
                scale_value : "",
                delay: 500,
            },elm_trig_thresh = 150
            )
        }
        else if( element == ".wandparticleBackdropCut")
        {
            AnimateOnScroll("mainContainer", ".wandparticleBackdropCut", 
            {
                type : "opacity",
                type_value : "0 *** 1",
                transition : "0.5s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : 450,
            },elm_trig_thresh = 305
    )
        }
        else if( element == ".wandparticleBackdrop")
        {
            AnimateOnScroll("mainContainer", ".wandparticleBackdrop", 
            {
                type : "transform",
                type_value : "translateX(-50%) scale(1.2) translateY(250px)***translateX(-50%) scale(1.2) translateY(0px)",
                transition : "1s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : 450,
            },elm_trig_thresh = 150
    )
        }
        else if( element == ".visuMagicContainer .FirstRowFirstLayout")
        {
            AnimateOnScroll("mainContainer", ".visuMagicContainer .FirstRowFirstLayout", 
            {
                type : "opacity",
                type_value : "0 *** 1",
                transition : "0.5s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "600",
            },elm_trig_thresh = 140
            )
        }
        else if( element == ".visuMagicContainer .FirstRowMiddleLayout")
        {
            AnimateOnScroll("mainContainer", ".visuMagicContainer .FirstRowMiddleLayout", 
            {
                type : "opacity",
                type_value : "0 *** 1",
                transition : "0.5s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "700",
            },elm_trig_thresh = 140
    )
        }
        else if( element == ".visuMagicContainer .FirstRowThirdLayout")
        {
            AnimateOnScroll("mainContainer", ".visuMagicContainer .FirstRowThirdLayout", 
            {
                type : "opacity",
                type_value : "0 *** 1",
                transition : "0.5s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "700",
            },elm_trig_thresh = 140
    )
        }
        else if( element == ".visuMagicContainer .SecondRowFirstLayout")
        {
            AnimateOnScroll("mainContainer", ".visuMagicContainer .SecondRowFirstLayout", 
    {
        type : "opacity",
        type_value : "0 *** 1",
        transition : "2s",
        initial_opacity : "0 1",
        scale_value : "",
        delay : "800",
    },elm_trig_thresh = -30
    )
        }
        else if( element == ".visuMagicContainer .SecondRowSecondLayout")
        {
            AnimateOnScroll("mainContainer", ".visuMagicContainer .SecondRowSecondLayout", 
            {
                type : "opacity",
                type_value : "0 *** 1",
                transition : "2s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "900",
            },elm_trig_thresh = -30
            )
        }
        else if( element == ".visuMagicContainer .ThirdRowFirstLayout")
        {
            AnimateOnScroll("mainContainer", ".visuMagicContainer .ThirdRowFirstLayout", 
    {
        type : "opacity",
        type_value : "0 *** 1",
        transition : "0.5s",
        initial_opacity : "0 1",
        scale_value : "",
        delay : "600",
    },elm_trig_thresh = -30
    )
        }
        else if( element == ".visuMagicContainer .ThirdRowMiddleLayout")
        {
            AnimateOnScroll("mainContainer", ".visuMagicContainer .ThirdRowMiddleLayout", 
            {
                type : "opacity",
                type_value : "0 *** 1",
                transition : "0.5s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "800",
            },elm_trig_thresh = -30
            )
        }
        else if( element == ".visuMagicContainer .ThirdRowThirdLayout")
        {
            AnimateOnScroll("mainContainer", ".visuMagicContainer .ThirdRowThirdLayout", 
            {
                type : "opacity",
                type_value : "0 *** 1",
                transition : "0.5s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "900",
            },elm_trig_thresh = -30
            )
        }
        else if( element == "#innoVistaLogo")
        {
            AnimateOnScroll("mainContainer", "#innoVistaLogo", 
            {
                type : "left",
                type_value : "-150%***50%",
                transition : "0.8s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "700",
            },elm_trig_thresh = 120
            )
        }
        else if( element == "#innoVista")
        {
        AnimateOnScroll("mainContainer", "#innoVista", 
        {
            type : "left",
            type_value : "150%***50%",
            transition : "0.8s",
            initial_opacity : "0 1",
            scale_value : "",
            delay : "400",
        },elm_trig_thresh = 70
        )
        }
        else if( element == "#innoVistaDesc")
        {
            AnimateOnScroll("mainContainer", "#innoVistaDesc", 
            {
                type : "top",
                type_value : "150%***200px",
                transition : "0.5s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "400",
            },elm_trig_thresh = 90
            )
        }
        else if( element == "#redirectSocialInnoVista")
        {
            AnimateOnScroll("mainContainer", "#redirectSocialInnoVista", 
            {
                type : "transform",
                type_value : "translateX(-50%) scale(0)***translateX(-50%) scale(1)",
                transition : "0.5s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "200",
            },elm_trig_thresh = 90
            )
        }
        else if( element == "#FirstRowFirstLayoutInnovate")
        {
            AnimateOnScroll("mainContainer", "#FirstRowFirstLayoutInnovate", 
            {
                type : "",
                type_value : "",
                transition : "0.5s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "400",
            },elm_trig_thresh = 110
            )
        }
        else if( element == "#FirstRowSecondLayoutInnovate")
        {
            AnimateOnScroll("mainContainer", "#FirstRowSecondLayoutInnovate", 
            {
                type : "",
                type_value : "",
                transition : "1s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "450",
            },elm_trig_thresh = 110
            )
        }
        else if( element == "#SecondRowFirstLayoutInnovate")
        {
            AnimateOnScroll("mainContainer", "#SecondRowFirstLayoutInnovate", 
            {
                type : "",
                type_value : "",
                transition : "1s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "500",
            },elm_trig_thresh = 20
            )
        }
        else if( element == "#SecondRowSecondLayoutInnovate")
        {   
            AnimateOnScroll("mainContainer", "#SecondRowSecondLayoutInnovate", 
            {
                type : "",
                type_value : "",
                transition : "1s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "550",
            },elm_trig_thresh = 10
            )
        }
        else if( element == ".autoEditaLogoMask")
        {
            AnimateOnScroll("mainContainer", ".autoEditaLogoMask", 
            {
                type : "filter",
                type_value : "blur(65px)***blur(0px)",
                transition : "0.8s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "900",
            },elm_trig_thresh = 70
            )
        }
        else if( element == ".autoEditaText")
        {
            AnimateOnScroll("mainContainer", ".autoEditaText", 
            {
                type : "width",
                type_value : "0px *** 450px",
                transition : "0.8s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "900",
            },elm_trig_thresh = 75
            )
        }
        else if( element == ".autoEditaDesc")
        {
            AnimateOnScroll("mainContainer", ".autoEditaDesc", 
            {
                type : "width",
                type_value : "0px *** auto",
                transition : "0.8s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "900",
            },elm_trig_thresh = 75
            )
        }
        else if( element == ".redirectSocialautoEdita")
        {
            AnimateOnScroll("mainContainer", ".redirectSocialautoEdita", 
            {
                type : "filter",
                type_value : "blur(65px)***blur(0px)",
                transition : "0.8s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "900",
            },elm_trig_thresh = 220
            )
        }
        else if( element == ".galleryImagesAutoEditaBtn")
        {
            AnimateOnScroll("mainContainer", ".galleryImagesAutoEditaBtn", 
            {
                type : "filter",
                type_value : "blur(65px)***blur(0px)",
                transition : "0.8s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "900",
            },elm_trig_thresh = 70
            )
        }
        else if( element == ".socialSectionAutoEditaBtn")
        {
            AnimateOnScroll("mainContainer", ".socialSectionAutoEditaBtn", 
            {
                type : "filter",
                type_value : "blur(65px)***blur(0px)",
                transition : "0.8s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "900",
            },elm_trig_thresh = 70
            )
        }
        else if( element == "#FirstRowFirstLayoutEdita")
        {
            AnimateOnScroll("mainContainer", "#FirstRowFirstLayoutEdita", 
            {
                type : "transform",
                type_value : "translateX(-550px)***translateX(0px)",
                transition : "0.5s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "600",
            },elm_trig_thresh = 90
            )
        }
        else if( element == "#FirstRowSecondLayoutEdita")
        {
            AnimateOnScroll("mainContainer", "#FirstRowSecondLayoutEdita", 
            {
                type : "transform",
                type_value : "translateX(950px)***translateX(670px)",
                transition : "0.5s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "600",
            },elm_trig_thresh = 90
            )
        }
        else if( element == ".designSageLogo")
        {
            AnimateOnScroll("mainContainer", ".designSageLogo", 
            {
                type : "filter",
                type_value : "blur(65px)***blur(0px)",
                transition : "0.8s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "200",
            },elm_trig_thresh = 70
            )
        }
        else if( element == ".designSageText")
        {
            AnimateOnScroll("mainContainer", ".designSageText", 
            {
                type : "",
                type_value : "",
                transition : "0.8s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "300",
            },elm_trig_thresh = 70
            )
        }
        else if( element == ".designSageDesc")
        {
            AnimateOnScroll("mainContainer", ".designSageDesc", 
            {
                type : "transform",
                type_value : "translateX(-50%)  translateY(120px) *** translateX(-50%)  translateY(0px)",
                transition : "0.8s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "300",
            },elm_trig_thresh = 70
            )
        }
        else if( element == ".redirectSocialdesignSage")
        {
            AnimateOnScroll("mainContainer", ".redirectSocialdesignSage", 
            {
                type : "filter",
                type_value : "blur(65px)***blur(0px)",
                transition : "0.8s",
                initial_opacity : "0 1",
                scale_value : "",
                delay : "300",
            },elm_trig_thresh = 70
            )
        }


    });
})






















// window.getComputedStyle(targetElementLcl).getPropertyValue(animationParameters.type) == "none" ? 
//     targetElementLcl.style[animationParameters.type]  = (animationParameters.type_value.split(" ")[1]) 
//     : 
//     targetElementLcl.style[animationParameters.type] = window.getComputedStyle(targetElementLcl).getPropertyValue(animationParameters.type) + " " + (animationParameters.type_value.split(" ")[1]) ;