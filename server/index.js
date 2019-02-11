const fs = require('fs')
const childProcess = require('child_process')
const util = require('util')

const asyncHandler = require('express-async-handler')
const uuidv4 = require('uuid/v4')
const rimraf = require('rimraf')
const express = require('express')
const bodyParser = require('body-parser')
const consola = require('consola')
const { Nuxt, Builder } = require('nuxt')
const app = express()

const readdir = util.promisify(fs.readdir)
const exec = util.promisify(childProcess.exec)
const mkdir = util.promisify(fs.mkdir)
const writeFile = util.promisify(fs.writeFile)

// Import and Set Nuxt.js options
const config = require('../nuxt.config.js')
config.dev = !(process.env.NODE_ENV === 'production')

async function start() {
  app.use(bodyParser.json())

  // Init Nuxt.js
  const nuxt = new Nuxt(config)

  const {
    host = process.env.HOST || '127.0.0.1',
    port = process.env.PORT || 3000
  } = nuxt.options.server

  // Build only in dev mode
  if (config.dev) {
    const builder = new Builder(nuxt)
    await builder.build()
  }

  app.get(
    '/api/pcaplist',
    asyncHandler(async (req, res, next) => {
      const ls = await readdir('./static/pcap', { withFileTypes: true })
      const pcaplist = []
      for (const ent of ls) {
        if (!ent.isFile) continue
        if (ent.name[0] === '.') continue
        if (!ent.name.endsWith('.pcap')) continue
        pcaplist.push(ent.name)
      }
      res.json(pcaplist)
    })
  )

  app.post(
    '/api/runrule',
    asyncHandler(async (req, res, next) => {
      const pcapFileName = req.body.pcapfilename
      const pcaplist = await readdir('./static/pcap')
      if (pcaplist.indexOf(pcapFileName) === -1) {
        res.status(500).json({ err: 'Invalid pcap file name' })
        return
      }
      const ruleContent = req.body.rule
      if (!ruleContent) {
        res.status(500).json({ err: "'rule' parameter missing" })
        return
      }

      const uuid = uuidv4()
      const command = `suricata -r ./static/pcap/${pcapFileName} -S /tmp/${uuid}/custom.rule -l /tmp/${uuid} -c ./suricata.yaml`

      await mkdir(`/tmp/${uuid}`)
      res.on('finish', () => rimraf(`/tmp/${uuid}`, () => {}))
      await writeFile(`/tmp/${uuid}/custom.rule`, ruleContent)
      const { stdout, stderr } = await exec(command)
      console.log('command:', command) // eslint-disable-line no-console
      console.log('stdout:', stdout) // eslint-disable-line no-console
      console.log('stderr:', stderr) // eslint-disable-line no-console
      console.log('ruleContent:', ruleContent) // eslint-disable-line no-console
      if (stderr) {
        res.status(500).json({ err: stderr })
      } else {
        res.sendFile(`/tmp/${uuid}/eve.json`)
      }
    })
  )

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
