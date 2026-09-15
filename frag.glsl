#version 300 es
precision highp float;

#define PI 3.1415926535

in vec2 v_uv;

out vec4 fragColor;

uniform float u_seed;
uniform float u_time;

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) - r + min(max(d.x, d.y), 0.0);
}

float rand(float seed) {
  return fract(sin(seed * 6543.34588) * 43758.5453);
}

void main() {
  const int N = 15;

  float r = length(v_uv);
  float band = floor(r * float(N));
  float band_seed = fract(rand(band + u_seed) * 26433.73457);

  float band_bottom = band / float(N);
  float band_top = (band + 1.0) / float(N);

  float uv_y = (r - band_bottom) / (band_top - band_bottom);
  float uv_x = acos(normalize(v_uv).x) / (PI * .5);

  float width = .75 + band_seed * .25;
  float band_mask = step(1. - width, uv_y) * (1. - step(width, uv_y));

  float speed = (band_seed - .5) * 2.;
  speed += sign(speed); // minimum

  float offset = u_time * speed;
  float noise = sin(4. * uv_x + band * 324.2784 + offset);
  noise = step(.6, noise);

  vec3 base = vec3(0.278, 0.796, 0.831);
  float variation = ((mod(band, 2.) * 2. - .5) * 0.25) + rand(band) * .1;
  vec3 color = base + variation;

  fragColor = vec4(color, 1.) * band_mask * noise;
}
