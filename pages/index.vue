<template>
  <v-layout row wrap>
    <v-flex xs12 sm9 justify-end>
      <h2>Rule</h2>
      <v-textarea
        v-model="rule"
        class="rule-textarea"
        dark
        solo
        ml-4
      ></v-textarea>
      <v-layout justify-end>
        <v-btn
          color="info"
          large
          :loading="loading"
          :disabled="loading"
          @click="runrule"
          >Submit</v-btn
        >
      </v-layout>
    </v-flex>
    <v-flex xs12 sm3>
      <h2>Config</h2>
      <v-radio-group v-model="pcapfilename">
        <v-radio v-for="pcap in pcaplist" :key="pcap" :value="pcap">
          <div slot="label">
            {{ pcap }}
            <a class="caption" :href="'/pcap/' + pcap">Download</a>
          </div>
        </v-radio>
      </v-radio-group>
    </v-flex>
    <v-flex xs12>
      <h2 v-if="results.length">Result</h2>
      <v-scroll-y-transition group>
        <Result
          v-for="result in results.slice().reverse()"
          :key="result.id"
          :result="result"
        ></Result>
      </v-scroll-y-transition>
    </v-flex>
  </v-layout>
</template>

<script>
import Result from '~/components/Result.vue'

export default {
  components: {
    Result
  },
  data() {
    return {
      rule: `alert tcp any any -> any any (msg:"sample rule(content)"; content:"images"; sid:1;)
alert tcp any any -> any any (msg:"sample rule(pcre)"; pcre:"/[0-9]{6}/i"; sid:2;)`,
      results: [],
      lastId: 1,
      loading: false
    }
  },
  async asyncData({ $axios }) {
    const pcaplist = await $axios.$get('/api/pcaplist')
    const pcapfilename = pcaplist[0]
    return { pcaplist, pcapfilename }
  },
  methods: {
    async runrule() {
      this.loading = true
      const newResult = {
        id: this.lastId++,
        datetime: new Date().toLocaleString(),
        rule: this.rule
      }
      try {
        const eve = await this.$axios.$post('/api/runrule', {
          pcapfilename: this.pcapfilename,
          rule: this.rule
        })
        if (typeof eve === 'string') {
          newResult.eve = JSON.parse(
            '[' + eve.trim().replace(/\n/g, ', ') + ']'
          )
        } else {
          newResult.eve = [eve]
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(error)
        try {
          newResult.err = error.response.data.err
        } catch (error) {
          newResult.err = error
        }
      }
      this.results.push(newResult)
      this.loading = false
    }
  }
}
</script>

<style>
.flex {
  padding: 0 1vw 1vw 1vw;
}
.rule-textarea {
  font-family: monospace, monospace;
  font-size: 14px;
}
</style>
