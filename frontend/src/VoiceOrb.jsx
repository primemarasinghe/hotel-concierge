import { useEffect, useRef } from "react";

const VERT = `
  precision highp float;
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAG = `
  precision highp float;
  uniform float iTime;
  uniform vec3 iResolution;
  uniform float hue;
  uniform float hover;
  uniform float rot;
  uniform float hoverIntensity;
  varying vec2 vUv;

  vec3 rgb2yiq(vec3 c) {
    return vec3(
      dot(c, vec3(0.299, 0.587, 0.114)),
      dot(c, vec3(0.596, -0.274, -0.322)),
      dot(c, vec3(0.211, -0.523, 0.312))
    );
  }
  vec3 yiq2rgb(vec3 c) {
    return vec3(
      c.x + 0.956 * c.y + 0.621 * c.z,
      c.x - 0.272 * c.y - 0.647 * c.z,
      c.x - 1.106 * c.y + 1.703 * c.z
    );
  }
  vec3 adjustHue(vec3 color, float hueDeg) {
    float r = hueDeg * 3.14159265 / 180.0;
    vec3 yiq = rgb2yiq(color);
    float i = yiq.y * cos(r) - yiq.z * sin(r);
    float q = yiq.y * sin(r) + yiq.z * cos(r);
    return yiq2rgb(vec3(yiq.x, i, q));
  }
  vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
    p3 += dot(p3, p3.yxz + 19.19);
    return -1.0 + 2.0 * fract(vec3(p3.x+p3.y, p3.x+p3.z, p3.y+p3.z) * p3.zyx);
  }
  float snoise3(vec3 p) {
    const float K1 = 0.333333333;
    const float K2 = 0.166666667;
    vec3 i = floor(p + (p.x+p.y+p.z)*K1);
    vec3 d0 = p - (i - (i.x+i.y+i.z)*K2);
    vec3 e = step(vec3(0.0), d0 - d0.yzx);
    vec3 i1 = e*(1.0-e.zxy);
    vec3 i2 = 1.0-e.zxy*(1.0-e);
    vec3 d1 = d0-(i1-K2);
    vec3 d2 = d0-(i2-K1);
    vec3 d3 = d0-0.5;
    vec4 h = max(0.6-vec4(dot(d0,d0),dot(d1,d1),dot(d2,d2),dot(d3,d3)),0.0);
    vec4 n = h*h*h*h*vec4(dot(d0,hash33(i)),dot(d1,hash33(i+i1)),dot(d2,hash33(i+i2)),dot(d3,hash33(i+1.0)));
    return dot(vec4(31.316), n);
  }
  vec4 extractAlpha(vec3 c) {
    float a = max(max(c.r,c.g),c.b);
    return vec4(c/( a+1e-5), a);
  }
  const vec3 baseColor1 = vec3(0.611765,0.262745,0.996078);
  const vec3 baseColor2 = vec3(0.298039,0.760784,0.913725);
  const vec3 baseColor3 = vec3(0.062745,0.078431,0.600000);
  const float innerRadius = 0.6;
  const float noiseScale  = 0.65;
  float light1(float i,float a,float d){return i/(1.0+d*a);}
  float light2(float i,float a,float d){return i/(1.0+d*d*a);}

  vec4 draw(vec2 uv) {
    vec3 c1 = adjustHue(baseColor1, hue);
    vec3 c2 = adjustHue(baseColor2, hue);
    vec3 c3 = adjustHue(baseColor3, hue);
    float ang = atan(uv.y, uv.x);
    float len = length(uv);
    float inv = len > 0.0 ? 1.0/len : 0.0;
    float n0 = snoise3(vec3(uv*noiseScale, iTime*0.5))*0.5+0.5;
    float r0 = mix(mix(innerRadius,1.0,0.4), mix(innerRadius,1.0,0.6), n0);
    float d0 = distance(uv, (r0*inv)*uv);
    float v0 = light1(1.0,10.0,d0) * smoothstep(r0*1.05,r0,len);
    float cl = cos(ang+iTime*2.0)*0.5+0.5;
    float a  = iTime*-1.0;
    vec2 pos = vec2(cos(a),sin(a))*r0;
    float d  = distance(uv, pos);
    float v1 = light2(1.5,5.0,d)*light1(1.0,50.0,d0);
    float v2 = smoothstep(1.0, mix(innerRadius,1.0,n0*0.5), len);
    float v3 = smoothstep(innerRadius, mix(innerRadius,1.0,0.5), len);
    vec3 col = mix(c1,c2,cl);
    col = mix(c3,col,v0);
    col = clamp((col+v1)*v2*v3, 0.0, 1.0);
    return extractAlpha(col);
  }

  void main() {
    vec2 center = iResolution.xy * 0.5;
    float size  = min(iResolution.x, iResolution.y);
    vec2 uv = (vUv*iResolution.xy - center) / size * 2.0;
    float s = sin(rot); float c = cos(rot);
    uv = vec2(c*uv.x - s*uv.y, s*uv.x + c*uv.y);
    uv.x += hover * hoverIntensity * 0.1 * sin(uv.y*10.0+iTime);
    uv.y += hover * hoverIntensity * 0.1 * sin(uv.x*10.0+iTime);
    vec4 col = draw(uv);
    gl_FragColor = vec4(col.rgb * col.a, col.a);
  }
`;

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

export default function VoiceOrb({
  className = "",
  hue = 0,
  enableVoiceControl = false,
  audioLevel = null,        // external 0-1 level; overrides internal mic when non-null
  voiceSensitivity = 1.5,
  maxRotationSpeed = 1.2,
  maxHoverIntensity = 0.8,
}) {
  const ctnDom        = useRef(null);
  const audioCtxRef   = useRef(null);
  const analyserRef   = useRef(null);
  const micRef        = useRef(null);
  const streamRef     = useRef(null);
  const dataArrRef    = useRef(null);
  const hueRef        = useRef(hue);
  const audioLevelRef = useRef(audioLevel);

  useEffect(() => { hueRef.current = hue; }, [hue]);
  useEffect(() => { audioLevelRef.current = audioLevel; }, [audioLevel]);

  function stopMic() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    micRef.current?.disconnect(); micRef.current = null;
    analyserRef.current?.disconnect(); analyserRef.current = null;
    if (audioCtxRef.current?.state !== "closed") audioCtxRef.current?.close();
    audioCtxRef.current = null;
    dataArrRef.current = null;
  }

  async function startMic() {
    stopMic();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: false, noiseSuppression: false, autoGainControl: false,
      }});
      streamRef.current = stream;
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtxRef.current.state === "suspended") await audioCtxRef.current.resume();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.3;
      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -10;
      micRef.current = audioCtxRef.current.createMediaStreamSource(stream);
      micRef.current.connect(analyserRef.current);
      dataArrRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      return true;
    } catch { return false; }
  }

  function getLevel() {
    if (!analyserRef.current || !dataArrRef.current) return 0;
    analyserRef.current.getByteFrequencyData(dataArrRef.current);
    let sum = 0;
    for (let i = 0; i < dataArrRef.current.length; i++) {
      const v = dataArrRef.current[i] / 255;
      sum += v * v;
    }
    return Math.min(Math.sqrt(sum / dataArrRef.current.length) * voiceSensitivity * 3, 1);
  }

  // WebGL setup
  useEffect(() => {
    const container = ctnDom.current;
    if (!container) return;

    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: true });
    if (!gl) return;

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(canvas);

    // Full-screen triangle
    const pos = new Float32Array([-1, -1, 3, -1, -1, 3]);
    const uvs = new Float32Array([0, 0, 2, 0, 0, 2]);

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);

    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

    const prog = gl.createProgram();
    gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const posLoc = gl.getAttribLocation(prog, "position");
    const uvLoc  = gl.getAttribLocation(prog, "uv");

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime     = gl.getUniformLocation(prog, "iTime");
    const uRes      = gl.getUniformLocation(prog, "iResolution");
    const uHue      = gl.getUniformLocation(prog, "hue");
    const uHover    = gl.getUniformLocation(prog, "hover");
    const uRot      = gl.getUniformLocation(prog, "rot");
    const uHoverInt = gl.getUniformLocation(prog, "hoverIntensity");

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width  = w + "px";
      canvas.style.height = h + "px";
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener("resize", resize);
    resize();

    let rafId;
    let currentRot = 0;
    let lastTime = 0;
    let micReady = false;

    if (enableVoiceControl) startMic().then(ok => { micReady = ok; });

    const tick = (t) => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min((t - lastTime) * 0.001, 0.05);
      lastTime = t;

      const extLevel = audioLevelRef.current;
      const level = extLevel !== null ? extLevel : ((enableVoiceControl && micReady) ? getLevel() : 0);
      const rotSpeed = 0.3 + level * maxRotationSpeed * 2;
      currentRot += dt * rotSpeed;

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime,     t * 0.001);
      gl.uniform3f(uRes,      canvas.width, canvas.height, canvas.width / canvas.height);
      gl.uniform1f(uHue,      hueRef.current);
      gl.uniform1f(uRot,      currentRot);
      gl.uniform1f(uHover,    Math.min(level * 2, 1));
      gl.uniform1f(uHoverInt, Math.min(level * maxHoverIntensity * 0.8, maxHoverIntensity));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      stopMic();
      if (container.contains(canvas)) container.removeChild(canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [enableVoiceControl, voiceSensitivity, maxRotationSpeed, maxHoverIntensity]);

  // React to enableVoiceControl toggling
  useEffect(() => {
    if (enableVoiceControl) startMic();
    else stopMic();
  }, [enableVoiceControl]);

  return (
    <div
      ref={ctnDom}
      className={`va-orb-canvas${className ? " " + className : ""}`}
    />
  );
}
