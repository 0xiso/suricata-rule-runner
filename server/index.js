const { execFile: execFilePromise } = require('child_process')
const fs = require('fs').promises
const util = require('util')
const execFile = util.promisify(execFilePromise)

const { Nuxt, Builder } = require('nuxt')
const { v4: uuidv4 } = require('uuid')
const consola = require('consola')
const express = require('express')
const rimraf = require('rimraf')

const app = express()

// Import and Set Nuxt.js options
const config = require('../nuxt.config.js')
config.dev = process.env.NODE_ENV !== 'production'

async function getPcapList() {
  return (await fs.readdir('./static/pcaps/')).filter((val) =>
    val.endsWith('.pcap')
  )
}

async function isValidPcapPath(path) {
  const validlist = await getPcapList()
  return validlist.includes(path)
}

async function start() {
  app.use(express.json())

  app.get('/api/pcaplist', async (req, res) => {
    res.json(await getPcapList())
  })

  app.post('/api/runrule', async (req, res) => {
    if (
      !req.body.suricataPcap ||
      typeof req.body.suricataPcap !== 'string' ||
      !req.body.suricataRule ||
      typeof req.body.suricataRule !== 'string'
    ) {
      req.statusCode(500).json({ err: 'invalid request' })
      return
    }
    const suricataPcap = req.body.suricataPcap
    const suricataRule = req.body.suricataRule
    consola.log(suricataRule)

    if (!isValidPcapPath(suricataPcap)) {
      req.statusCode(500).json({ err: 'invalid pcap' })
      return
    }
    const uuid = uuidv4()
    const args = [
      '-r',
      `./static/pcaps/${suricataPcap}`,
      '-S',
      `/tmp/${uuid}/custom.rule`,
      '-l',
      `/tmp/${uuid}`,
      '-c',
      './suricata.yaml'
    ]
    consola.log(args)

    await fs.mkdir(`/tmp/${uuid}`)
    res.on('finish', () =>
      rimraf(`/tmp/${uuid}`, () => {
        consola.log(`/tmp/${uuid} removed`)
      })
    )
    await fs.writeFile(`/tmp/${uuid}/custom.rule`, suricataRule)
    let stdout, stderr
    try {
      ;({ stdout, stderr } = await execFile('/usr/bin/suricata', args, {
        timeout: 10 * 1000
      }))
    } catch (error) {
      consola.error(error)
      res.status(500).json({})
      return
    }
    consola.log(stdout)
    consola.log(stderr)

    if (stderr) {
      res.status(500).json({ err: stderr })
    } else {
      res.sendFile(`/tmp/${uuid}/eve.json`)
    }
  })

  // Init Nuxt.js
  const nuxt = new Nuxt(config)

  const { host, port } = nuxt.options.server

  await nuxt.ready()
  // Build only in dev mode
  if (config.dev) {
    const builder = new Builder(nuxt)
    await builder.build()
  }

  // Give nuxt middleware to express
  app.use(nuxt.render)

  // Listen the server
  app.listen(port, host)
  consola.ready({
    message: `Server listening on http://${host}:${port}`,
    badge: true
  })
}
start()
