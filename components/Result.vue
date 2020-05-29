<template>
  <v-card dark :color="result.err ? '#650909' : ''" class="mb-1" width="100%">
    <v-card-text>
      <div>
        <span class="title grey--text">#{{ result.id }}</span>
        <span class="grey--text">{{ result.datetime }}</span>
        <span v-if="!result.err">| Got {{ result.eve.length }} alert(s).</span>
        <pre class="fixed-width">{{ result.rule }}</pre>
        <v-divider></v-divider>
        <pre v-if="!result.err" class="fixed-width">{{
          JSON.stringify(eve, null, 2)
        }}</pre>
        <pre v-if="result.err" class="fixed-width">Error: {{ result.err }}</pre>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  props: {
    result: {
      type: Object,
      required: true
    }
  },
  computed: {
    eve() {
      return this.result.eve.map((row) => {
        const r = {
          timestamp: row.timestamp,
          'src->dest': `${row.src_ip}:${row.src_port} -> ${row.dest_ip}:${row.dest_port}`,
          signature: row.alert.signature
        }
        if ('http' in row && 'hostname' in row.http && 'url' in row.http) {
          r.url = row.http.hostname + row.http.url
        }
        return r
      })
    }
  }
}
</script>

<style scoped>
.fixed-width {
  font-family: monospace, monospace;
}
pre {
  white-space: pre-wrap;
}
</style>
