// Auto-generated from Gastador Intro.html
export const INTRO_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#F3F5F6">
<title>Gastador Intro</title>
<style>
:root{--bg:#F3F5F6;--ink:#315D8A;--sub:#7A817F;--glow:rgba(49,93,138,.10);box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}


*,*::before,*::after{box-sizing:border-box}
html,body{height:100%;margin:0;background:var(--bg);color:var(--ink);overflow:hidden;-webkit-tap-highlight-color:transparent;font-family:"Manrope",system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
.stage{position:relative;height:100%;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(14px,3.2dvh,30px);padding:0 24px;text-align:center;cursor:pointer;user-select:none}
.markwrap{position:relative;width:min(46vw,28dvh,240px);aspect-ratio:1}
.markwrap::before{content:"";position:absolute;inset:-45%;border-radius:50%;background:radial-gradient(circle,var(--glow),transparent 65%)}
.mark{position:relative;width:100%;height:100%;display:block;overflow:visible}
.tile{transform-box:fill-box;transform-origin:center}
.c{fill:none;stroke:#315D8A;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;transform-origin:60px 60px}
.p{fill:none;stroke:#EFEDE4;stroke-width:6;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1 2;stroke-dashoffset:0}
.b{fill:none;stroke:#EFEDE4;stroke-width:5.5;stroke-linecap:round;transform-origin:62px 58px}
.flash{fill:#fff;opacity:0}
.word{margin:0;font-size:clamp(34px,11.5vw,60px);font-weight:800;letter-spacing:-.035em;line-height:1;display:flex}
.word span{display:inline-block}
.tag{margin:0;font-size:clamp(13px,3.9vw,18px);color:var(--sub);letter-spacing:.02em}
.tag b{color:var(--ink);font-weight:600}
.hint{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 22px);font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--sub);opacity:.7}
.play .markwrap::before{animation:glow 1.5s ease-out 1s both}
.play .tile{animation:tile .55s cubic-bezier(.2,.9,.25,1.15) both}
.play .c{animation:lock .55s cubic-bezier(.2,.9,.25,1) both;animation-delay:calc(.3s + var(--i) * .06s)}
.play .stem{animation:draw .35s cubic-bezier(.65,0,.3,1) .8s both}
.play .bowl{animation:draw .35s cubic-bezier(.65,0,.3,1) .98s both}
.play .b{animation:bar .3s cubic-bezier(.2,.9,.25,1.2) both;animation-delay:calc(1.12s + var(--i) * .07s)}
.play .flash{animation:flash .4s ease-out 1.35s both}
.play .word span{animation:rise .5s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(1.5s + var(--i) * .05s)}
.play .tag{animation:fade .6s ease 2.05s both}
.play .hint{animation:fade .6s ease 2.9s both}
@keyframes tile{from{transform:scale(.55);opacity:0}}
@keyframes lock{from{transform:scale(1.7);opacity:0}}
@keyframes draw{from{stroke-dashoffset:1}}
@keyframes bar{from{transform:scaleX(0);opacity:0}}
@keyframes flash{0%{opacity:0}25%{opacity:.4}100%{opacity:0}}
@keyframes rise{from{opacity:0;transform:translateY(16px)}}
@keyframes fade{from{opacity:0}}
@keyframes glow{from{opacity:0;transform:scale(.4)}60%{opacity:1}}
@media (prefers-reduced-motion:reduce){.play *,.play *::before{animation:none!important}}
@media (orientation:landscape) and (max-height:480px){.markwrap{width:min(22vw,34dvh)}.word{font-size:clamp(26px,6vw,40px)}}
.stage:not(.play){opacity:0}
</style>
</head>
<body>
<main class="stage" id="stage" role="img" aria-label="Gastador logo intro. Tap to skip.">
<div class="markwrap">
<svg class="mark" viewBox="0 0 120 120" aria-hidden="true">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#0A2F8E"/>
<stop offset="1" stop-color="#2E7BCB"/>
</linearGradient>
</defs>
<rect class="tile" width="120" height="120" rx="30" fill="url(#bg)"/>
<path class="c" style="--i:0" d="M26 46V36a10 10 0 0 1 10-10H46"/>
<path class="c" style="--i:1" d="M74 26H84a10 10 0 0 1 10 10V46"/>
<path class="c" style="--i:2" d="M94 74V84a10 10 0 0 1-10 10H74"/>
<path class="c" style="--i:3" d="M46 94H36a10 10 0 0 1-10-10V74"/>
<path class="p stem" pathLength="1" d="M53.6 44V82"/>
<path class="p bowl" pathLength="1" d="M53.6 46H66a11 11 0 0 1 0 22H53.6"/>
<path class="b" style="--i:0" d="M43 54.6H81"/>
<path class="b" style="--i:1" d="M43 61H81"/>
<rect class="flash" width="120" height="120" rx="30"/>
</svg>
</div>
<h1 class="word" aria-hidden="true"><span style="--i:0">G</span><span style="--i:1">a</span><span style="--i:2">s</span><span style="--i:3">t</span><span style="--i:4">a</span><span style="--i:5">d</span><span style="--i:6">o</span><span style="--i:7">r</span></h1>
<p class="tag">Snap it. <b>Track it.</b> Stretch it.</p>
</main>
<script>
(function(){
var s=document.getElementById("stage");
var started=false;
function send(m){if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(m);}}
function start(){
if(started)return;
started=true;
s.classList.add("play");
setTimeout(function(){send("done");},3300);
}
var fontsReady=(document.fonts&&document.fonts.ready)?document.fonts.ready:Promise.resolve();
var timeout=new Promise(function(r){setTimeout(r,800);});
Promise.race([fontsReady,timeout]).then(start);
s.addEventListener("click",function(){send("done");});
})();
</script>
</body>
</html>
`;
