<template>
  <div class="card">
    <div class="card__header">
      <h1>Login</h1>
    </div>
    <form method="POST" :action="'/interaction/' + uuid + '/submit'">
      <div class="card__body">
        <div class="form-group">
          <label for="email">E-Mail:</label>
          <input type="email" id="email" name="email" autofocus>
        </div>
        <div class="form-group">
          <label for="password">Password:</label>
          <input type="password" id="password" name="password">
        </div>
      </div>
      <div class="card__footer">
          <button class="button button--full" type="submit">Let's go</button>
      </div>
    </form>
  </div>
</template>

<script>

export default {
  asyncData({ params }) {
    return {
      uuid: params.id,
    }
  },
  layout: 'login',
}

</script>

<style lang="scss" scoped>
.card {
  left: 50%;
  position: absolute;
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
}
</style>
