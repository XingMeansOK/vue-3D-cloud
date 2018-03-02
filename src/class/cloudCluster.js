/*
  云团簇类，包含一个或多个云团类对象，这些云团的云顶高都是一样的
  云顶高一致，且连在一起的所有点都认为是在一个云团中
  @param int ctt当前的云顶高度
  @param object dataSource CTT对象
*/
export default function CloudCluster(ctt, dataSource) {
  this.CTT = ctt;
  this.indexes = []; // 存放点在dataSource.data(indexInCTT)中的索引
  this.dataSource = dataSource; // 数据源对象
  this.rows = dataSource.nrows; // 总行数
  this.cols = dataSource.ncols; // 总列数
  this.data = dataSource.data; // 数据
  this.clouds = []; // 用于保存云团的数组
  this.segment.bind(this);
}
/*
  添加数据点到this.data
  @param int indexInDataSource云团点在DataSource.data(indexInCTT)中的索引
*/
CloudCluster.prototype.add = function(indexInDataSource) {
  this.indexes.push(indexInDataSource);
}
/*
  获取当前云团簇中的云团数组
  @return array
*/
CloudCluster.prototype.getClouds = function() {
  let cloud = new Cloud();
  // 分割出一块云团
  this.segment(this.indexes[0], cloud);
  if(cloud.indexes.lenght > 19) {
    this.clouds.push(cloud);
  }
  this.updateIndexes(cloud);
  debugger
  // 如果没有分割完，继续分割
  if(this.indexes.length !== 0) {
    this.getClouds();
  }
}
/*
  将云团簇中已经分割出去的云团的索引去掉
  @param object cloud分割出去的云团
*/
CloudCluster.prototype.updateIndexes = function(cloud) {
  let a = new Set(cloud.indexes);
  let b = new Set(this.indexes);
  // 求差集
  let differenceABSet = new Set([...b].filter(x => !a.has(x)));
  this.indexes = Array.from(differenceABSet);
  debugger
}
/*
  从云团簇分割出一个云团
  判断一个点四周的点是否和这个点的云顶高相同，
  如果相同，同时是相连的，说明是在同一块云内
  然后这样迭代生长，得到一整片相连的云团
  @param int indexInCTT当前点在CTT.data(dataSource)中的索引
  @param object cloud当前的云团
*/
CloudCluster.prototype.segment = function(indexInCTT, cloud) {
  // 如果云顶高度与当前一致并且当前云团中没有这个点
  if(this.data[indexInCTT] === this.CTT && cloud.indexes.indexOf(indexInCTT) === -1) {
    cloud.add(indexInCTT);
    // 得到当前点的行号和列号
    let colsIndex = indexInCTT % this.cols; // 索引对列数取模，得到列号（从0开始）
    let rowsIndex = Math.floor(indexInCTT / this.cols); // 得到行号（从0开始）
    let round = []; // 当前点四周，满足条件，可以进行迭代的点的索引
    // 判断四周的点是否满足迭代条件（没有超过边界）
    if(colsIndex !== 0) { // 如果不是一行第一个点
      round.push(indexInCTT - 1); // 则可以向左侧生长
    }
    if(colsIndex < this.cols - 1) { // 如果不是一行中最后一个点
      round.push(indexInCTT + 1); // 则可以向右生长
    }
    if(rowsIndex !== 0) { // 如果不是一列中第一个点
      round.push(indexInCTT - this.cols); // 可以向上生长
    }
    if(rowsIndex < this.rows - 1) { // 如果不是最后一行的点
      round.push(indexInCTT + this.cols); // 可以向下生长
    }
    for(let i = 0; i < round.length; i++) {
      this.segment(round[i], cloud);
    }
  }
}

/*
  云团类
*/
class Cloud {
  constructor() {
    this.indexes = [];
  }
  // 将索引添加到当前云团
  add(indexInCTT) {
    this.indexes.push(indexInCTT);
  }
}
