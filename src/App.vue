<template>
  <div id="app">
    <!-- <img src="./assets/logo.png"> -->
    <!-- <HelloWorld/> -->
    <XCanvas/>
  </div>
</template>

<script>
// import HelloWorld from './components/HelloWorld'
import XCanvas from './components/XCanvas'

export default {
  name: 'app',
  components: {
    // HelloWorld,
    XCanvas
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
* {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
