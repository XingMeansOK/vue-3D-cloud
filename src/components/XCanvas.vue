<!-- 鼠标的交互方式是旋转物体 -->
<template>
  <canvas ref="canvas"
    @mousedown.prevent="mouseDown"
    @mousemove.prevent="mouseMove"
    @mouseup.prevent="mouseUp" @mouseleave.prevent="mouseUp"
  >
  </canvas>
</template>
    <!-- @wheel.prevent="mouseWheel" -->

<script>
  import Matrix4 from '../class/matrix4'
  import {Vector3, Vector4} from '../class/matrix4'
  import CloudCluster from '../class/cloudCluster'
  import { clamp } from '../class/util.js'
  import Particle from '../class/particle.js'
  import {particlesInOrder, particlesToArray, calcParticlesRGBA} from '../class/particle.js'

  const CTH = require('../assets/cth22_0200.json'); // 云顶高度 （其实应该是cth）
  const CTT = require('../assets/ctt22_0200.json'); // 云顶温度 （应该是ctt）
  const COLS = 2048; // 数据的列数
  const ROWS = 1800; // 数据的行数
  const LENGTHOFSIDE = 2; // 每个数据点所代表方格的边长
  const FILLVALUE = -32768; // 数据填充值，没有云的区域
  const MX = COLS*LENGTHOFSIDE/2; // x轴方向的平移
  const MZ = ROWS*LENGTHOFSIDE/2; // z轴方向的平移
  const LIGHTDIRECTION = [0.0, -1.0, 0.0]; // 光源方向
  // 限制绕x轴方向旋转（-r，r）
  const ROTATEXLIMIT = Math.PI/6;
  const FOVMAX = 120; // 视角最大值
  const FOVMIN = 10; // 视角最小值
  var valid = 0; // 粒子个数
  var vIndex = []; // 有效数据点在CTH.data中的索引
  var cloudClusters = []; // 保存所有云团簇的数组，云团簇这里指云顶高度一致的云团的集合

  export default {
    name: 'xcanvas',
    methods: {
      // 旋转物体的鼠标交互方式
      /*
        鼠标左键按下响应函数
      */
      mouseDown(e) {
        let x = e.pageX, y = e.pageY;
        // 如果鼠标在canvas范围内，状态改变为拖拽ing
        let rect = e.target.getBoundingClientRect();
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
          this.oldMouseLoc[0] = x; this.oldMouseLoc[1] = y;
          this.dragging = true;
        }
      },
      /*
        鼠标左键抬起响应函数
      */
      mouseUp(e) {
        this.dragging = false;// 结束拖拽
      },
      /*
        鼠标拖动响应函数
      */
      mouseMove(e) {
        if (!this.dragging) return false;
        const {canvas} = this.$refs;
        // 单次鼠标拖拽弧度变化量
        this.dX = (e.pageX-this.oldMouseLoc[0])*2*Math.PI/canvas.width,
        this.dY = (e.pageY-this.oldMouseLoc[1])*2*Math.PI/canvas.height;
        this.theta += this.dX; // 水平弧度总变化量
        this.phi = clamp(this.phi+this.dY, -ROTATEXLIMIT, ROTATEXLIMIT); // 竖直方向弧度总变化量,限制其大小
        this.oldMouseLoc[0] = e.pageX, this.oldMouseLoc[1] = e.pageY;
      },
      /*
        鼠标滚轮缩放
      */
      mouseWheel(e) {
        const {canvas} = this.$refs;
        const gl = this.gl;
        let x = e.pageX;
        let y = e.pageY;
        let w = canvas.width;
        let h = canvas.height;
        // 屏幕坐标转化到webgl坐标（-1,1）
        let glX = 2*x/w-1;
        let glY = 2*y/h-1;
        let glZ = -0.5;
        let a = new Vector4([glX, glY, glZ,1]);

        /*
          *******模拟webgl世界坐标转屏幕坐标的过程********
          这个过程在3d数学基础那本书或者收藏的网页里都能找到
        */
        // let c = new Vector4([900, 100, 700, 1]); // 测试用webgl世界坐标系下的点，w分量为1
        // // b是一个Vector4类型的实例
        // let b = this.mvpMatrix.multiplyVector4(c); // 与当前的mvp矩阵相乘得到裁剪坐标系下的坐标（正常情况下在顶点着色器中完成，这里只是模拟）
        // // 经过mvp矩阵转换，得到了正确的w分量值
        // let glW = b.elements[3]; // 保存w分量
        // // 坐标都除w得到标准化屏幕坐标NDC，这个webgl会自动完成，这里只是模拟
        // b.elements = b.elements.map(value => {
        //   return value/glW;
        // });
        // // 得到屏幕坐标，实际也是会自动完成的
        // b.elements[0] = (b.elements[0]+1)*w/2;
        // b.elements[1] = (b.elements[1]+1)*h/2;
        // b.elements[2] = (b.elements[2]+1)/2;
        // /*
        //   ********屏幕坐标转换到webgl世界坐标********
        // */
        // // 屏幕坐标转NDC
        // b.elements[0] = b.elements[0]*2/w-1;
        // b.elements[1] = b.elements[1]*2/h-1;
        // b.elements[2] = b.elements[2]*2-1; // 因为屏幕上只有xy信息，z信息的获取还很复杂（涛哥说raycast），这里先不考虑
        // // 乘以w分量。实际上w分量的值可以是无限多
        // // 假设屏幕上一点a，视景体内，摄像机和a点所在直线上所有点都投影在了a点，不同的w就是对应这条线上的不同点
        // b.elements = b.elements.map(value => {
        //   return value*glW;
        // });
        // // 以上得到了裁剪坐标系下的坐标，再乘以mvp矩阵的逆矩阵，得到webgl世界坐标系下坐标
        // let glWorldCoordinate = this.mvpMatrix.invert().multiplyVector4(b);


        /*
          “mousewheel” 事件中的 “event.wheelDelta” 属性值：返回的值，如果是正值说明滚轮是向上滚动，如果是负值说明滚轮是向下滚动；
          返回的值，均为 120 的倍数，即：幅度大小 = 返回的值 / 120。
        */
        /*
          “DOMMouseScroll” 事件中的 “event.detail” 属性值：返回的值，如果是负值说明滚轮是向上滚动（与 “event.wheelDelta” 正好相反），如果是正值说明滚轮是向下滚动；
          返回的值，均为 3 的倍数，即：幅度大小 = 返回的值 / 3。
        */
        debugger
        let delta = clamp(e.wheelDelta || -e.detail, -4, 4);
        this.zoom = delta > 0 ? "zoomin" : "zoomout"; // 鼠标滚轮向上，放大，向下为缩小
        this.dFov = delta * 1; // 单次缩放的大小
        let fov = this.fov - this.dFov;
        // this.fov控制场景的缩放，表示平截头体的上下表面夹角，增加则场景缩小，减小则场景放大
        this.fov = clamp(fov, FOVMIN, FOVMAX); // 限制场景缩放大小
      },
      /*
        过滤云数据,符合条件的返回true，不符合条件的返回false
      */
      dataFilter(index) {
        // 分别获取index点上下左右点的数据
        let up = CTH.data[index-COLS];
        let down = CTH.data[index+COLS];
        let left = CTH.data[index-1];
        let right = CTH.data[index+1];
        // 如果上下或者左右都没有数据，返回false
        if((up === FILLVALUE&&down === FILLVALUE)||(right === FILLVALUE&&left === FILLVALUE)) {
          return false;
        } else {
          return true;
        }
      },
      draw() {
        const gl = this.gl;
        const AMORTIZATION = 0.95;
        let mvpMatrix = new Matrix4(); // 模型，视图，投影矩阵

        // 拖动之后旋转速度逐渐放缓的动画效果
        if (!this.dragging) { // 停止鼠标拖拽，每次重绘还旋转一定的角度，这个角度每次重绘都会减小
           this.dX *= AMORTIZATION, this.dY *= AMORTIZATION;
           this.theta+=this.dX, this.phi = clamp(this.phi+this.dY, -ROTATEXLIMIT, ROTATEXLIMIT); // 竖直方向弧度总变化量,限制其大小
        }
        // 缩放逐渐放缓的动画效果，每次重绘，fov还会发生一些变化，这个变化每次重绘也会逐渐变小
        this.dFov *= 0.85;
        this.fov = clamp(this.fov - this.dFov, FOVMIN, FOVMAX);
        /*
                   **********视图，投影坐标变换矩阵的处理***********
        */
        // 视图投影变换矩阵
        let viewProjMatrix = new Matrix4()
        // 投影变换矩阵(视角，屏幕横纵比，近截面，远截面决定)
        let aspect = gl.drawingBufferWidth / gl.drawingBufferHeight
        viewProjMatrix.setPerspective(this.fov, aspect, 100, 5000);
        // 设置视图(摄像机位置，观察方向，上方向决定)
        // 前三个值为摄像机观察位置，中间三个是目标方向，最后三个是上方向
        viewProjMatrix.lookAt(0.0, MX, MZ, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0)
        mvpMatrix.set(viewProjMatrix);
        // 设置旋转
        mvpMatrix.rotate(this.theta, true, 0.0, 1.0, 0.0); // 绕y轴旋转
        mvpMatrix.rotate(this.phi, true, 1.0, 0.0, 0.0); // 绕x轴旋转

        this.mvpMatrix = mvpMatrix;
        // 向着色器中传递mvp矩阵
        gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'uMvpMatrix'),
          false, mvpMatrix.elements);
        /*
          *********更新时间*********
        */
        // 向着色器中传递当前经过的时间,毫秒
        let t = new Date().getTime() - this.startTime;
        gl.uniform1f(gl.getUniformLocation(this.program, 'uTime'), t);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);     // Clear buffers
        gl.drawArrays(gl.POINTS, 0, valid) // 最后一个参数是顶点个数

        requestAnimationFrame(this.draw.bind(this));
      },
      /*
        根据CTH.data中的索引求出CTT.data中的索引
        @param int indexInCTT
        @return int indexInCOT
      */
      getIndexInCOTBy(indexInCTT) {
        // 获取在CTH.data中的行列号
        let colsCTT = indexInCTT % COLS; // 索引对列数取模，得到列号（从0开始）
        let rowsCTT = Math.floor(indexInCTT / COLS); // 得到行号（从0开始）
        // 获取对应在CTT.data中的行列号
        let rowsCOT = parseInt(rowsCTT/5);
        let colsCOT = parseInt(colsCTT/5) > 408 ? 408 : parseInt(colsCTT/5);
        // 获取在CTT.data中的索引
        return rowsCOT*CTT.ncols + colsCOT;
      },
      /*
        获取粒子速度
        @param int indexInCTT粒子在CTH.data中的索引
        @return array 返回一个长度为3的数组，分别代表x,y,z的方向
      */
      getVeloCity(indexInCTT) {
        // const c = 8/100000;
        const c = 16/100000;
        let b = (d) => {
          let a = Math.random() > 0.5? 1 : -1;
          return a*Math.random()*d;
        }
        // return [b(c), b(c), b(c)];
        return [c, 0.0, c];
      },
      /*
        获取加速度
        @param int indexInCTT粒子在CTH.data中的索引
        @return array 返回一个长度为3的数组，分别代表x,y,z的方向
      */
      getAccelerate(indexInCTT) {
        const c = 0.000001;
        let b = (d) => {
          let a = Math.random() > 0.5? 1 : -1;
          return a*Math.random()*d;
        }
        // return [b(c), b(c), b(c)];
        return [c, 0.0, -c];
      },
      /*
        生成粒子
        @param int indexInCTT粒子在CTH.data中的索引
        @param array vOrigin 保存粒子对象的数组
      */
      generateParticle(indexInCTT, aParticle) {
        let indexInCOT = this.getIndexInCOTBy(indexInCTT);
        // 获取光学厚度
        let cot = CTT.data[indexInCTT];
        // let cot = CTT.data[indexInCOT];
        let ctt = CTH.data[indexInCTT];
        if(cot === FILLVALUE || ctt === FILLVALUE) { // -999
          return;
        } else {
          let tRandom; // 随机的高度
          // tRandom = parseInt(Math.random()*t); // 随机一个在该点高度范围以内的高度，起始值
          tRandom = cot;
          // if(t === FILLVALUE || !this.dataFilter(index)) return;
          let colsIndex = indexInCTT % COLS; // 索引对列数取模，得到列号（从0开始）
          let rowsIndex = Math.floor(indexInCTT / COLS); // 得到行号（从0开始）
          // 每个数据点目前认为是其所在方格的左上角(首先的到的是相对坐标，即整个区域的左上角在xoz平面的原点)
          // 起始位置
          let x = colsIndex*LENGTHOFSIDE - MX; // 列号x方格边长，得到x坐标
          let a = Math.random() > 0.5? 1:-0.1;
          // let y = ctt/10; // 云顶高度（范围是10,11000）,y坐标
          let y = ctt/10-a*Math.random()*(cot/100); // 云顶高度（范围是10,11000）,y坐标
          let z = rowsIndex*LENGTHOFSIDE - MZ; // 行号x方格边长，得到z坐标
          let life = Math.random()*10000+10000; // 粒子的生命周期，毫秒
          let size = Math.random()*cot/30 + 1; // 粒子的大小
          let p = new Particle(x, y, z, life, size); // 创建粒子实例
          // 初速度,时间单位都是毫秒
          let b = this.getVeloCity(indexInCTT);
          p.velocity = b; // 设置粒子的初速度
          // 加速度
          let c = this.getAccelerate(indexInCTT);
          p.accelerate = c; // 设置粒子的加速度
          // 将粒子推入粒子数组
          aParticle.push(p);
          // 粒子总数加一
          valid++;
        }
      },
      /*
        获取所有云团簇（云顶高一样的点）
      */
      generateCloudClusters() {
        const data = CTH.data;
        vIndex.forEach(indexInCTT => {
          let cloudCluster = this.getCloudClusterOf(data[indexInCTT]);
          cloudCluster.add(indexInCTT);
        })
        debugger
        // cloudClusters[1].getClouds();
        let c = [];
        // 清除云量过少的云层
        cloudClusters.forEach( ( cloudCluster ) => {
          cloudCluster.indexes.length > 1000 && c.push( cloudCluster );
        } )
        cloudClusters = c;
      },
      /*
        判断是否已经有云顶高度是这个高度的云团簇
        如果有，返回这个云团簇的引用
        没有则新建一个云团簇
        @param int CTH
      */
      getCloudClusterOf(ctt) {
        for(let i = 0; i < cloudClusters.length; i++) {
          // 两个云团，云高相同的情况还没有考虑！！！！！！
          if(cloudClusters[i].CTH === ctt) {
            // 如果当前云团的云顶高等于ctt，返回当前云团
            return cloudClusters[i];
          }
        }
        let cc = new CloudCluster(ctt, CTH);
        cloudClusters.push(cc);
        return cc;
      }
    },
    mounted () {
      /*
                ******canvas对象的获取和初始化*******
      */
      // 获取canvas对象
      const {canvas} = this.$refs;
      // canvas的默认宽高为300px*150px，在css中设置canvas的宽高，实际上是把canvas在300px*150px的基础上进行了拉伸。所以绘制出来的图像会发生变形。
      // 设置了body的padding和margin为0， document.body.clientWidth和下面的效果就是一样的
      canvas.width = document.documentElement.clientWidth;
      canvas.height = document.documentElement.clientHeight;
      // 获取webgl的context
      const gl = this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') // getWebGLContext(canvas)
      // 如果获取失败就返回
      if (!gl) {
        console.log('Fail to get webgl context')
        return
      }
      // 设置canvas初始化颜色（清楚画面的颜色）
      gl.clearColor(0.0, 0.0, 0.0, 1.0)
      // 设置canvas初始化深度
      gl.clearDepth(1.0)
      // 清除颜色缓存和深度缓存
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      /*
                ********着色器和程序对象的相关处理*********
      */
      // 获取着色器代码
      const shaders = {
        fragment: require('../shader/fragment.glsl'),
        vertex: require('../shader/vertex.glsl')
      }
      // 生成程序对象
      this.program = gl.createProgram()

      // 创建顶点着色器
      let vertex = this.shaders.vertex = gl.createShader(gl.VERTEX_SHADER)
      // 为着色器分配着色器代码
      gl.shaderSource(vertex, shaders.vertex)
      // 编译着色器
      gl.compileShader(vertex)
      // 判断着色器是否编译成功, 编译成功，将着色器分配给程序对象
      if (gl.getShaderParameter(vertex, gl.COMPILE_STATUS)) {
        gl.attachShader(this.program, vertex)
      } else {
        // 如果着色器出错
        console.log(gl.getShaderInfoLog(vertex))
      }

      // 创建片段着色器
      let fragment = this.shaders.fragment = gl.createShader(gl.FRAGMENT_SHADER)
      // 为着色器分配着色器代码
      gl.shaderSource(fragment, shaders.fragment)
      // 编译着色器
      gl.compileShader(fragment)
      // 判断着色器是否编译成功，编译成功，将着色器分配给程序对象
      if (gl.getShaderParameter(fragment, gl.COMPILE_STATUS)) {
        gl.attachShader(this.program, fragment)
      } else {
        console.log(gl.getShaderInfoLog(fragment))
      }

      // 连接着色器
      gl.linkProgram(this.program)
      // 判断着色器连接是否成功，成功的话则应用该程序对象
      if (gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        gl.useProgram(this.program)
      } else {
        gl.getProgramInfoLog(this.program)
      }
      /*
        数据预处理，剔除数据填充点
      */
      CTH.data.forEach( (t, index) => {
        if(t === FILLVALUE) return;
        vIndex.push(index); // 保存有效点的索引
        // valid++;
      })
      this.generateCloudClusters();
      /*
                   **********顶点缓存的生成***********
      */
      // 模型（顶点）数据
      // 数据预处理
      var aParticles = []; // 保存粒子实例的数组
      //随机位置个数
      let randomCount = 7500;
      // 获取光学厚度的最大值
      var cotMax = 0;
      CTT.data.forEach(value => {
        cotMax < value && (cotMax = value);
      })
      // 产生随机数，根据随机数获得光学厚度，如果光学厚度越小，这个随机数被淘汰的可能性就越大,被淘汰了就从新产生
      // 参数指定了要从哪些点中随机取点
      var getRandom = (vIndex) => {
        let indexInVIndex = parseInt(Math.random()*vIndex.length); // 随机获取一个有值点在vIndex中的索引
        let indexInCTT = vIndex[indexInVIndex]; // vIndex保存了有值点在CTH.data中的索引
        let indexInCOT = this.getIndexInCOTBy(indexInCTT); // 得到在CTT.data中的索引
        if(CTT.data[indexInCOT]*4/cotMax < Math.random()) { // 当前选择的随机值可能被淘汰
          return getRandom(vIndex);
        } else {
          return indexInCTT;
        }
      }
      // let arr = cloudClusters[6].indexes; // 随机点的取值范围
      debugger
      cloudClusters.forEach( ( cloudCluster ) => {
        let arr = cloudCluster.indexes; // 随机点的取值范围
        let randomCount = parseInt( arr.length / 50 );
        for(let i = 0; i< randomCount; i++) {
          // this.generateParticle(getRandom(arr), vOrigin);
          this.generateParticle(getRandom(arr), aParticles);
        }
      } )
      // let arr = vIndex;

      // 将粒子按照与光源的距离排序
      let aParticlesInOrder = particlesInOrder(aParticles, LIGHTDIRECTION, [0, MX, 0]);
      // 根据光照计算粒子颜色、透明度
      calcParticlesRGBA(aParticlesInOrder, LIGHTDIRECTION);
      // 将粒子实例的属性转换为数组元素
      let vOrigin = particlesToArray(aParticlesInOrder);
      /*
      准备向buffer写入的数据不是一般数组，需要new类型化数组，否则报错，错误信息如下：
      GL ERROR :GL_INVALID_OPERATION :
      glDrawArrays: attempt to access out of range vertices in attribute 0
      */
      const vertices = new Float32Array(vOrigin);
      // 创建顶点缓冲区VBO
      var vertexBufferObject = gl.createBuffer();
      // 绑定缓冲区
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
      // 向缓冲区中写入数据
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
      /*
        想要向缓冲区中写入数据之前要先将缓冲区对象与webgl上下文对象绑定，就像光盘放入光驱中一样
      */
      // // 创建顶点索引缓冲区
      // var indexBufferObject = gl.createBuffer()
      // // 目前，WebGL在使用 ELEMENT_ARRAY_BUFFER 时，不得使用精度超过 Uint16Array
      // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObject)
      // // 写入索引数据
      // gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)
      /*
        顶点索引缓冲区的作用是避免重复使用的点在顶点缓冲区中重复写
        例如，绘制面的时候以三角形为单元绘制，绘制两个有公用边的三角形，
        不使用索引(a*代表一个点坐标)：
        顶点[a1,a2,a3,a2,a3,a4]
        使用索引的情况：
        顶点[a1,a2,a3,a4]，索引[0,1,2,1,2,3]
      */

      /*
            ************缓冲区数据写入着色器************
      */
      // 获取着色器中变量名为‘aVertexPosition’的attribute变量的地址，或者说是代表这个变量的序号
      debugger
      let vertexAttribLoc_Pos = gl.getAttribLocation(this.program, 'aVertexPosition');
      let vertexAttribLoc_Velo = gl.getAttribLocation(this.program, 'aVertexVelocity');
      let vertexAttribLoc_Acc = gl.getAttribLocation(this.program, 'aVertexAccelerate');
      let vertexAttribLoc_Life = gl.getAttribLocation(this.program, 'aLifeTime');
      let vertexAttribLoc_Radius = gl.getAttribLocation(this.program, 'aRadius');
      let vertexAttribLoc_RGBA = gl.getAttribLocation(this.program, 'aRGBA');
      // 通过刚刚获取的序号使其代表的attribute属性激活
      gl.enableVertexAttribArray(vertexAttribLoc_Pos);
      gl.enableVertexAttribArray(vertexAttribLoc_Velo);
      gl.enableVertexAttribArray(vertexAttribLoc_Acc);
      gl.enableVertexAttribArray(vertexAttribLoc_Life);
      gl.enableVertexAttribArray(vertexAttribLoc_Radius);
      gl.enableVertexAttribArray(vertexAttribLoc_RGBA);
      // 向着色器中写入数据
      gl.vertexAttribPointer(vertexAttribLoc_Pos, 3, gl.FLOAT, false, Particle.step * 4, 0);
      gl.vertexAttribPointer(vertexAttribLoc_Velo, 3, gl.FLOAT, false, Particle.step * 4, 3 * 4);
      gl.vertexAttribPointer(vertexAttribLoc_Acc, 3, gl.FLOAT, false, Particle.step * 4, 6 * 4);
      gl.vertexAttribPointer(vertexAttribLoc_Life, 1, gl.FLOAT, false, Particle.step * 4, 9 * 4);
      gl.vertexAttribPointer(vertexAttribLoc_Radius, 1, gl.FLOAT, false, Particle.step * 4, 10 * 4);
      gl.vertexAttribPointer(vertexAttribLoc_RGBA, 4, gl.FLOAT, false, Particle.step * 4, 11 * 4);
      /*
        webgl上下文对象同时只能绑定一个缓冲区，
        也就是说，向当前激活的着色器属性中写入的就是当前绑定的缓冲区中的数据

        解释一下vertexAttribPointer的参数：前面几个直接看api，解释下最后两个
        倒数第二个是每个顶点数据的长度，例如，每个顶点的数据包含5个元素，每个元素是4个字节
        所以，数据长度（步长）就是5*4，最后一个参数是开始读取数据的偏移量。
        例如，向vertexAttribLoc写入数据，偏移量是0，数据个数是3（第二个参数指定），所以，读取的就是每个顶点数据（5*4个字节）
        的前3*4（gl.FLOAT: 32-bit 指定了数据是4字节）个字节的数据；向vertexAttribLocUV写入数据，
        偏移量是3*4，数据个数是2，所以，读取的就是每个顶点数据最后2*4个字节的数据

        问题：着色器中aVertexPosition是vec4类型，但是这里只写入了三个数据？？？？？？?最后一个齐次坐标有默认值？？
        webgl编程指南中找到答案，确实是有一个默认值，齐次坐标默认w给1
      */
      /*
        ***************写入光源****************
      */
      // 定义光源方向
      // let lightDirection = new Vector3(LIGHTDIRECTION);
      // lightDirection.normalize(); // 归一化处理
      // gl.uniform3fv(gl.getUniformLocation(this.program, 'uLightDirection'), lightDirection.elements); // 写入光源方向
      // gl.uniform3f(gl.getUniformLocation(this.program, 'uLightColor'), 1.0, 1.0, 1.0); // 写入光源颜色
      /*
        ********处理纹理*********
        点精灵纹理，参考了两个opengl的例子，单独看都看不懂。。合起来看
        http://blog.csdn.net/king1425/article/details/72356460
        http://blog.csdn.net/tom_221x/article/details/38434627
      */
      // 加载纹理图片
      let loadImg = new Promise((resolve, reject) => {
            let img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = 'static/cloud11.png';
            // img.src = 'static/cloud11.png'; // 目前比较理想的效果，测试用上面那行测试
        });
      loadImg.then( img => {
        // 创建纹理对象
        debugger
        let texture = gl.createTexture();
        // 获取着色器中纹理变量地址
        let textureLoc = gl.getUniformLocation(this.program, 'uTexture');
        // 激活0号纹理单元，这个就相当于一个柜子，有多个柜子TEXTURE0,1,2...现在就是把当前的纹理对象放在了0号柜子里
        gl.activeTexture(gl.TEXTURE0);
        // 在对纹理对象操作之前，同样需要绑定纹理对象，同时第一个参数指明纹理类型，也就是说，之后操作的就是当前绑定的纹理对象
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // 检查当前绑定的纹理对象
        if(gl.getParameter(gl.TEXTURE_BINDING_2D)) {
          // 设置纹理参数
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST); // 纹理放大方法
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST); // 纹理缩小方法
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); // 水平填充方法
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); // 垂直填充方法
          // 将图片设置给纹理对象
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          // 把0号柜子里的纹理传给片段着色器
          gl.uniform1i(textureLoc, 0);
          /*
                    ************绘制*************
          */
          // gl.enable(gl.DEPTH_TEST); // 被遮挡的像素将不会绘制
          // 开启混合功能
          gl.enable(gl.BLEND);
          // 指定混合函数
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          this.startTime = new Date().getTime();
          this.draw();
        }
      })
    },
    data () {
      return {
        gl: null,
        dragging: false, // 鼠标是否在拖拽
        oldMouseLoc: [0, 0], // 鼠标拖拽过程中，鼠标左键按下的位置,两个元素分别表示x,y
        dX: 0, // 单次鼠标拖动，水平弧度变化量
        dY: 0, // 单次鼠标拖动，竖直弧度变化量
        theta: 0, // "seita"水平方位角,模型需要旋转的弧度
        phi: 0, // "fai"俯仰角，模型需要旋转的弧度
        fov: 100, // 透视投影平截头体上下表面的夹角, degree
        dFov: null, // 单次缩放的角度变化量（放大为正，缩小为负）
        mvpMatrix: null, // 当前的mvp矩阵
        startTime: null, // 首次渲染的时间
        program: null,
        shaders: {
          vertex: null,
          fragment: null
        },
        bundle: 'static/hall-of-fame/', // 位于static文件夹会复制一份到dist目录下
        format: 'jpg'
      }
    }
  }
</script>
