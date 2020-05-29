<template>
  <v-row>
    <v-col cols="9">
      <h2>Rule</h2>
      <v-textarea v-model="suricataRule" filled></v-textarea>
      <v-btn block :loading="loading" @click="submit">
        <v-icon left>mdi-cube-send</v-icon>
        Submit
      </v-btn>
      <h2 v-if="results.length">Result</h2>
      <v-scroll-y-transition group>
        <Result
          v-for="result in results"
          :key="result.id"
          :result="result"
        ></Result>
      </v-scroll-y-transition>
    </v-col>
    <v-col>
      <h2>
        Pcap file
      </h2>
      <p v-if="pcaplist.length === 0">
        No pcap files found. Please reload this page to retry.
      </p>
      <v-radio-group v-model="suricataPcap" column>
        <v-radio
          v-for="pcapFilename in pcaplist"
          :key="pcapFilename"
          :label="pcapFilename"
          :value="pcapFilename"
        ></v-radio>
      </v-radio-group>
    </v-col>
  </v-row>
</template>

<script>
import Result from '~/components/Result.vue'

export default {
  components: {
    Result
  },
  async asyncData({ $axios, error }) {
    const getPcaplist = async () => {
      const resp = await $axios.get('/api/pcaplist')
      if (resp.status !== 200 || !Array.isArray(resp.data)) {
        return []
      }
      return resp.data.sort()
    }

    const pcaplist = await getPcaplist()
    return {
      loading: false,
      pcaplist,
      lastResultId: 1,
      results: [],
      suricataPcap: pcaplist[0],
      suricataRule: `alert tcp any any -> any any (msg:"sample rule(content)"; content:"images"; sid:1;)
alert tcp any any -> any any (msg:"sample rule(pcre)"; pcre:"/[0-9]{6}/i"; sid:2;)`
    }
  },
  methods: {
    async submit(event) {
      this.loading = true
      const newResult = {
        id: this.lastResultId++,
        timestamp: new Date().toLocaleString(),
        rule: this.suricataRule,
        pcap: this.suricataPcap
      }

      try {
        const resp = await this.$axios.$post('/api/runrule', {
          suricataPcap: this.suricataPcap,
          suricataRule: this.suricataRule
        })
        if (typeof resp === 'string') {
          newResult.eve = JSON.parse(
            '[' + resp.trim().replace(/\n/g, ',') + ']'
          )
        } else {
          newResult.eve = [resp]
        }
      } catch (error) {
        try {
          newResult.err = error.response.data.err
        } catch (error) {
          newResult.err = error
        }
      }
      this.results.unshift(newResult)
      this.loading = false
    }
  }
}
</script>
