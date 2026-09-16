#version 300 es
precision highp float;

#define PI 3.1415926535

in vec2 v_uv;

out vec4 fragColor;

uniform float u_seed;
uniform float u_time;
uniform int u_band_count;
uniform float u_band_base_width;
uniform float u_band_base_speed;
uniform float u_band_min_speed;
uniform float u_aspect_ratio;
uniform vec3 u_base_color;

float rand(float seed) { return fract(sin(seed * 6543.34588) * 43758.5453); }

void main() {
  int N = max(u_band_count, 1);

  vec2 uv = vec2(v_uv.x * u_aspect_ratio, v_uv.y);

  float r = length(uv);
  float band = floor(r * float(N));
  float band_seed = fract(rand(band + u_seed) * 26433.73457);

  float band_bottom = band / float(N);
  float band_top = (band + 1.0) / float(N);

  float uv_y = (r - band_bottom) / (band_top - band_bottom);
  float uv_x = acos(normalize(uv).x) / (PI * .5);

  float width = u_band_base_width + band_seed * .25;
  float band_mask = step(1. - width, uv_y) * (1. - step(width, uv_y));

  float speed = (band_seed - .5) * u_band_base_speed;
  speed += sign(speed) * u_band_min_speed;

  float offset = u_time * speed;
  float noise = sin(4. * uv_x + band * 324.2784 + offset);
  noise = step(.6, noise);

  vec3 base = u_base_color;
  float variation = ((mod(band, 2.) * 2. - .5) * 0.25) + rand(band) * .1;
  vec3 color = base + variation;

  fragColor = vec4(color, 1.) * band_mask * noise;
}
