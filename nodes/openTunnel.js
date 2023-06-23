/**
 * Copyright 2015 Atsushi Kojo.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
const { createTunnel } = require('../lib/tunnel-ssh');
const enableDestroy = require('server-destroy');

module.exports = function (RED) {
  'use strict';

  let server = null;
  let client = null;
  // var ftp = require('ftp');
  // var fs = require('fs');

  // const ReadableStream = require('stream');

  function TunnelNode(n) {
    RED.nodes.createNode(this, n);
    // let node = this;
    let keyFile = null;
    let keyData = null;

    if (n.sshkey) {
      keyFile = 'keyFile';
      keyData = n.sshkey;
    }

    // console.log('=====');
    // console.log(n.autoclose);
    // console.log('=====');

    this.options = {
      name: n.name || 'default',
      host: n.host || 'localhost',
      port: n.port || 22,
      username: n.username,
      password: n.password || null,
      keyFile,
      keyData,
      srcAddr: n.srcAddr || 'localhost',
      srcPort: n.srcPort,
      dstAddr: n.dstAddr || 'localhost',
      dstPort: n.dstPort,
      autoclose: n.autoclose || true,
      reconnectTimeout: 3000,
    };
  }

  RED.nodes.registerType('tunnel', TunnelNode);

  function TunnelOpen(n) {
    RED.nodes.createNode(this, n);
    this.tunnel = n.tunnel;
    this.operation = n.operation;
    this.filename = n.filename;
    this.fileExtension = n.fileExtension;
    this.workdir = n.workdir;
    this.tunnelConfig = RED.nodes.getNode(this.tunnel);

    // const globalContext = this.context().global;

    if (!this.tunnelConfig) {
      this.error('missing tunnel SSH configuration');
      return;
    }

    let node = this;
    // Hack for async function
    console.log('A');
    setTimeout(async () => {
      console.log('B');
      await connect(node);
    });

    node.on('input', async (msg, send, done) => {
      console.log('On Message');
      console.log(msg);
      setTimeout(async () => {
        await connect(node);
      }, node.tunnelConfig.options.reconnectTimeout);
    });
  }

  async function clearServerConnection() {
    return new Promise((resolve, reject) => {
      if (!server) {
        server = null;
        return resolve();
      }

      enableDestroy(server);

      if (!server.listening) {
        server = null;
        return resolve();
      }

      server.destroy();
      return resolve();

      // server.close(() => {
      //   server = null;
      //   console.log('X4');
      //   return resolve();
      // });
      // server.unref();
    });
  }

  async function clearClientConnection() {
    return new Promise((resolve) => {
      if (!client) {
        return resolve();
      }
      client.end().destroy();
      client = null;
      return resolve();
      // c.on('close', () => {
      //   console.log('Client closed');
      //   return resolve();
      // });
      // c.on('end', () => {
      //   console.log('Client closed');
      //   return resolve();
      // });
      // c.on('error', () => {
      //   console.log('Client closed with error');
      //   return resolve();
      // });
    });
  }

  async function connect(node) {
    node.status({ fill: 'red', shape: 'ring', text: 'disconnected' });

    /*Tunnel SSH options*/
    //  node.tunnelConfig.options.host
    //  node.tunnelConfig.options.port
    //  node.tunnelConfig.options.username
    //  node.tunnelConfig.options.password
    //  node.tunnelConfig.options.keyData

    //  node.tunnelConfig.options.srcAddr
    //  node.tunnelConfig.options.scrPort
    //  node.tunnelConfig.options.dstAddr
    //  node.tunnelConfig.options.dstPort

    //  node.tunnelConfig.options.autoclose

    const forwardOptions = {
      srcAddr: node.tunnelConfig.options.srcAddr,
      srcPort: parseInt(node.tunnelConfig.options.srcPort),
      dstAddr: node.tunnelConfig.options.dstAddr,
      dstPort: parseInt(node.tunnelConfig.options.dstPort),
    };

    const tunnelOptions = {
      autoClose: false, //node.tunnelConfig.options.autoclose,
    };

    const serverOptions = {
      port: parseInt(node.tunnelConfig.options.srcPort),
    };

    let sshOptions = {
      host: node.tunnelConfig.options.host,
      port: parseInt(node.tunnelConfig.options.port),
      username: node.tunnelConfig.options.username,
      password: node.tunnelConfig.options.password,
      // privateKey: readFileSync('/Users/andrea/Downloads/ssh-key-2022-10-18.key'),
    };

    if (node.tunnelConfig.options.keyData) {
      delete sshOptions.password;
      sshOptions = { ...{ privateKey: node.tunnelConfig.options.keyData }, ...sshOptions };
    }

    try {
      await clearClientConnection();
      await clearServerConnection();
      [server, client] = await createTunnel(tunnelOptions, serverOptions, sshOptions, forwardOptions, (err) => {
        // throw err;
        node.error(err, { payload: 'Error in tunnel ssh' });
        node.status({ fill: 'red', shape: 'dot', text: 'Error' });
      });
      node.status({ fill: 'green', shape: 'dot', text: 'Connect' });
    } catch (err) {
      node.error(err, { payload: 'Open tunnel ssh error', message: err.message });
      node.status({ fill: 'red', shape: 'dot', text: 'Error' });
    }

    // console.log('************');
    // console.log('Tunnel SSH tunnelConfig: ' + JSON.stringify(this.tunnelConfig));
    // console.log('************');
  }

  RED.nodes.registerType('tunnel open', TunnelOpen);
};
