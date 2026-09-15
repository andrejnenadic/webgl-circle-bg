const FPS = 24;
const FRAME_TIME = 1000 / FPS;

async function compileShader(gl, name, type) {
  const code = await fetch(name).then((x) => x.text());
  const shader = gl.createShader(type);
  gl.shaderSource(shader, code);
  gl.compileShader(shader);

  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  console.log(name, gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

async function createProgram(gl, fragPath, vertPath) {
  const vert = await compileShader(gl, vertPath, gl.VERTEX_SHADER);
  const frag = await compileShader(gl, fragPath, gl.FRAGMENT_SHADER);
  if (!vert || !frag) return;

  const program = gl.createProgram();
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);

  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
}

function createBuffers(gl) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const verts = [
    // x y uvx uvy
    1, 1, 1, 1, 1, -1, 1, 0, -1, -1, 0, 0, -1, 1, 0, 1,
  ];
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(verts), gl.STATIC_DRAW);

  gl.vertexAttribPointer(0, 2, gl.FLOAT, 0, 4 * 4, 0);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, 0, 4 * 4, 2 * 4);
  gl.enableVertexAttribArray(1);

  const indices = [0, 1, 3, 1, 2, 3];
  const ebo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    Uint32Array.from(indices),
    gl.STATIC_DRAW,
  );

  gl.bindVertexArray(null);
  return vao;
}

document.addEventListener("DOMContentLoaded", async () => {
  const canvas = document.querySelector("canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    console.log("No webgl context");
    return;
  }

  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);

  const program = await createProgram(gl, "./frag.glsl", "./vert.glsl");
  if (!program) return;

  gl.useProgram(program);
  const uniformLocs = {
    seed: gl.getUniformLocation(program, "u_seed"),
    time: gl.getUniformLocation(program, "u_time"),
  };

  const vao = createBuffers(gl);

  let paused = document.hidden;
  let lastFrameTime = 0;
  let accumulator = 0;

  document.addEventListener("visibilitychange", () => {
    paused = document.hidden;
    lastFrameTime = performance.now();
  });

  const seed = Math.random();

  requestAnimationFrame(animate);
  function animate(now) {
    requestAnimationFrame(animate);

    if (paused) {
      lastFrameTime = now;
      accumulator = 0;
      return;
    }

    if (!lastFrameTime) {
      lastFrameTime = now;
    }

    let frameDelta = now - lastFrameTime;
    lastFrameTime = now;

    // prevent huge spikes even if browser hiccups, but never catch up
    frameDelta = Math.min(frameDelta, 1000);
    accumulator += frameDelta;

    if (accumulator < FRAME_TIME) {
      return;
    }

    accumulator = Math.min(accumulator, FRAME_TIME);
    accumulator -= FRAME_TIME;

    draw(now);
  }

  function draw(now) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindVertexArray(vao);
    gl.useProgram(program);

    gl.uniform1f(uniformLocs.seed, seed);
    gl.uniform1f(uniformLocs.time, now / 1000);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_INT, 0);
  }

  function onResize() {
    const dpr = window.devicePixelRatio;

    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
    draw(performance.now());
  }
  window.addEventListener("resize", onResize);
  onResize();
});
