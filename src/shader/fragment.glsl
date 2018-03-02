precision mediump float;
varying vec4 vRGBA;
uniform sampler2D uTexture;

void main() {
    // gl_FragColor = vec4(1.0, 1.0, 1.0, 0.1) ;
    // 绘制圆形的顶点
    float dist = distance(gl_PointCoord, vec2(0.5, 0.5));
    if(dist < 0.5) {
      gl_FragColor = vRGBA*texture2D(uTexture, gl_PointCoord);
    } else {
      discard;
    }

}
