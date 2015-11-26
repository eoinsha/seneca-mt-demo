'use strict';
const seneca = require('seneca')()
const senecaContet = require('seneca-context')

seneca.add({role:'api', cmd:'post'}, (args, done) => {
  seneca.make('blog/posts').save$(args.post, done)
})

seneca.act({role:'web', use:{
  prefix: '/api/',
  pin: {role:'api', cmd:'*'},
  map: {
    'post': {GET: true}
  }
}})

const app = require('express')()
const bodyparser = require('body-parser')
app.use(bodyparser.json())
app.use(bodyparser.urlencoded({ extended: true }))
app.use(seneca.export('web'))
app.listen(8020)
