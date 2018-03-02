const STEP = 15; // 顶点数据的步长（每个顶点的数据个数）
/*
  粒子类
*/
export default class Particle {
  static get step() {
    return STEP;
  }
  // 粒子位置，生命时长，大小
  constructor(x, y, z, life, size) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.life = life;
    this.size = size;
    this.velo = null; // 粒子初速度
    this.acc = null; // 粒子加速度
    this.rgba = null; // 粒子颜色
    this.dis = null; // 粒子到光源的距离
  }
  /*
    甚至粒子初速度
    @param array a 数组前三个元素分别代表粒子在三个方向上的初速度
  */
  set velocity(a) {
    this.velo = a;
  }
  /*
    粒子颜色rgba
    @param array a颜色数组
  */
  set RGBA(a) {
    this.rgba = a;
  }
  /*
    甚至粒子加速度
    @param array a 数组前三个元素分别代表粒子在三个方向上的加速度
  */
  set accelerate(a) {
    this.acc = a;
  }
  /*
    @return 将当前对象转化数组
  */
  toArray() {
    return [
      this.x,
      this.y,
      this.z,
      ...this.velo,
      ...this.acc,
      this.life,
      this.size,
      ...this.rgba
    ]
  }
  // 得到代表粒子位置的数组
  get loc() {
    return [this.x, this.y, this.z];
  }
  // 粒子距离光源的距离
  set distanceToLight(a) {
    this.dis = a;
  }
  get distanceToLight() {
    return this.dis;
  }
}

/*
  将粒子重新排序，按照粒子距离平面的距离排序，距离最近的放在数组的第一个位置，以此类推
  @param array object a保存粒子的数组
  @param array float b保存平面法向量的数组
  @param array float c保存平面上一个点的坐标
  @return array object 返回新的数组，保存了排序之后的粒子
*/
export function particlesInOrder(a, b, c) {
  // 交换a数组中索引为i和j的元素位置
  var swap = (i, j, a) => {
    let t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  var f = (a, b, c) => {
    let d = distanceBetween(a.loc, b, c);
    a.distanceToLight = d;
    return d;
  }
  for(var i = 0; i < a.length - 1; i++) {
    for(var j = 0; j < a.length - 1 - i; j++) {
      // 排序的过程中把粒子到光源的距离作为粒子的属性存下来
      let d1 = a[j].distanceToLight || f(a[j], b, c);
      let d2 = a[j + 1].distanceToLight || f(a[j + 1], b, c);
      d1 > d2 && swap(j, j + 1, a);
    }
  }
  return a;
}
/*
  将一个元素为粒子对象的数组，按照对象展开，转化为元素为数字的数组，这些数字代表了粒子的属性
  @param Array a
  @return array
*/
export function particlesToArray(a) {
  var b = [];
  a.forEach(p => {
    p.toArray().forEach(d => {
      b.push(d);
    })
  })
  return b;
}
/*
  获取点到平面的直线距离
  @param array a 点
  @param array b 平面法向量
  @param array c 平面上一点
  @return 距离
*/
function distanceBetween(a, b, c) {
  // 得到平面方程 Ax + By + Cz = D ;A（x-x0）+B（y-y0）+C（z-z0）=0 ;其中x0y0z0为平面上一点，即c
  // ABC是法向量，即b
  const A = b[0], B = b[1], C = b[2];
  const D = b[0]*c[0] + b[1]*c[1] + b[2]*c[2];
  //   点（a,b,c） 到平面 Ax+By+Cz=D 的距离
  // =|A*a+B*b+C*c-D| /√(A^2+B^2+C^2)
  return Math.abs(A*a[0] + B*a[1] + C*a[2] - D)/Math.sqrt(A*A + B*B + C*C);
}
/*
  依据光照计算一组粒子对象的颜色和透明度
  @param array a粒子对象数组
  @param array b光源方向
*/
export function calcParticlesRGBA(a, b) {
  const L = 1; // 入射光辐射度
  var dMin = a[0].distanceToLight; // 到光源距离的最大值
  var dMax = a[a.length - 1].distanceToLight; // 到光源距离的最小值
  const d = dMax - dMin;
  // 遍历粒子数组，为每个粒子设置RGBA
  for(let i = 0; i < a.length; i++) {
    // a[i].RGBA = [0.03, 0.03, 0.03, 0.075]; // 比较理想的效果
    // let c = (1 - (a[i].distanceToLight - dMin) / d)*0.5;
    let c = 1.0;
    a[i].RGBA = [c, c, c, 0.1];
  }
}
