#version 300 es
precision highp float;

#define PI 3.1415926535

in vec2 v_uv;

out vec4 fragColor;

uniform float u_seed;

void main() {
  const int N = 5;

  float r = length(v_uv);
  float band = floor(r * float(N));

  float band_bottom = band / float(N);
  float band_top = (band + 1.0) / float(N);

  float uv_y = (r - band_bottom) / (band_top - band_bottom);
  float uv_x = acos(normalize(v_uv).x) / (PI * .5);

  float noise = sin(4. * uv_x + band * 374.2784) + sin(PI * uv_x);
  noise = step(.5, noise);

  float band_mask =
    step(.1, uv_y) *
      (1. - step(.9, uv_y));

  fragColor = vec4(1.) * band_mask * noise;
}
