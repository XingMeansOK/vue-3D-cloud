attribute vec3 aVertexPosition; // 粒子初始位置
attribute vec3 aVertexVelocity; // 粒子速度
attribute vec3 aVertexAccelerate; // 粒子加速度
attribute float aLifeTime; // 粒子的生命时长，毫秒
attribute float aRadius; // 粒子的大小
attribute vec4 aRGBA; // 粒子的颜色和透明度
varying vec4 vRGBA; // 用于将颜色信息传递给片元着色器，片元着色器中有一个相同名称的变量
uniform mat4 uMvpMatrix; // mvp矩阵
uniform float uTime; // 程序运行时长
// uniform vec3 uLightDirection; // 平行光源方向
// uniform vec3 uLightColor; // 平行光源颜色
/*
  求余
  @param float dividend 被除数
  @param float divisor 除数
  @return float余数
*/
float getRemainder(float dividend, float divisor) {
  if(dividend < divisor) {
    return dividend;
  } else {
    int d = int(dividend / divisor); // 获得相除之后的整数部分
    return dividend - float(d) * divisor;
  }
}
/*
  获取新的坐标
  @param vec3 pos粒子初始位置
  @param vec3 v粒子初速度
  @param vec3 a粒子加速度
  @return vec3新坐标
*/
vec4 updateVec4Loc(vec3 pos, vec3 v, vec3 a) {
  vec4 newLoc;
  // 获取程序运行时长除以粒子生命时长的余数
  float t = getRemainder(uTime, aLifeTime);
  for(int i = 0; i < 3; i++ ) {
    // 速度加速度计算之后得到的新的坐标分量
    newLoc[i] = pos[i] + v[i]*t + 0.5*a[i]*t*t;
  }
  newLoc.w = 1.0;
  return newLoc;
}
/*
  获取当前粒子尺寸
  粒子大小随着时间呈梯形变化
  @return float 粒子尺寸
*/
float getSize() {
  float c1 = 0.6, c2 = 0.4; // 前c2%的时间用于长大，后（1-c1）%的时间用于消亡
  // 获取程序运行时长除以粒子生命时长的余数
  float t = getRemainder(uTime, aLifeTime);
  float s; // 计算后的粒子大小
  if(t > aLifeTime*c1) { // 缩小过程
    s = (aLifeTime - t)*aRadius/((1.0 - c1)*aLifeTime);
  } else if(t < aLifeTime*c2){  // 生长过程
    s = (t/(c2*aLifeTime))*aRadius;
  } else { // 稳定不变
    s = aRadius;
  }
  return s;
}
void main() {
  // 新世界坐标乘以mvp矩阵得到裁剪坐标
  gl_Position = uMvpMatrix * updateVec4Loc(aVertexPosition, aVertexVelocity, aVertexAccelerate);
  // 粒子大小
  gl_PointSize = 20.0;
  // gl_PointSize = getSize()*20.0;
  // varying变量赋值，传递给片元着色器
  vRGBA = aRGBA;
}
