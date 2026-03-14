const net = require('net');

const testPort = (port, name) => {
  return new Promise((resolve) => {
    const socket = net.createConnection(port, 'localhost', () => {
      console.log(name + ':OPEN');
      socket.destroy();
      resolve();
    }).on('error', () => {
      console.log(name + ':CLOSED');
      resolve();
    });
  });
};

Promise.all([
  testPort(5432, 'pg'),
  testPort(6379, 'redis'),
  testPort(4000, 'backend'),
  testPort(3000, 'frontend')
]).then(() => process.exit(0));
