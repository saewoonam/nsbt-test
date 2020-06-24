function convertToCsv(data) {
  return JSON.stringify(data)
    .replace(/],\[/g, '\n')
    .replace(/]]/g, '')
    .replace(/\[\[/g, '')
    // in JSON, double quotes are escaped, but in CSV they need to be
    // escaped by another double quote
    .replace(/\\"/g, '""');
}

function isZero(n){ return n === 0 }

function buf2hex(buffer) { // buffer is an ArrayBuffer
  // https://stackoverflow.com/questions/40031688/javascript-arraybuffer-to-hex
  return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

function data2hex(uint8array) {
  // https://stackoverflow.com/questions/40031688/javascript-arraybuffer-to-hex
  return Array.prototype.map.call(uint8array, x => ('00' + x.toString(16)).slice(-2)).join('');
}

export function bytesToCsv(raw) {
  const blockSize = 32 // bytes
  const numBlocks = raw.byteLength / blockSize
  let last_mark = 0

  for (let index = 0; index < numBlocks; index++) {
    let view = new Uint32Array(raw.buffer, index * blockSize, blockSize / 4)

    if (view.every(isZero)) {
      last_mark = index
    }
  }

  let last_start = last_mark + 2
  let first, last, epoch_minute, id, flag, flag2
  let mean37, n37, min37, max37, std237
  let mean38, n38, min38, max38, std238
  let mean39, n39, min39, max39, std239

  console.log('last_start: ', last_start);
  console.log('numBlocks', numBlocks)
  // Should check that last_mark is < numBlocks
  let matrix = [
    ['time', 'epoch_minute', 'first', 'last',
      'mean37', 'n37', 'min37', 'max37', 'var37',
      'mean38', 'n38', 'min38', 'max38', 'var38',
      'mean39', 'n39', 'min39', 'max39', 'var39',
      'flag', 'flag2', 'encounter_id'
    ]
  ]

  for (let index = last_start; index < numBlocks; index += 2) {
    let row = new DataView(raw.buffer, index * blockSize, 2 * blockSize)
    // console.log(row)
    first = row.getUint8(6)
    last = row.getUint8(7)
    epoch_minute = row.getUint32(8, true)
    let d = new Date(epoch_minute * 60 * 1000 - 3600 * 6 * 1000)
    // console.log(d)
    let date_string = d.toISOString()
    date_string = date_string.split('.')
    date_string = date_string[0]
    id = new Uint8Array(raw.buffer, index * blockSize + 12, blockSize) //row.buffer.slice(12, 12 + 32)
    // console.log(id)
    id = data2hex(id)
    // console.log(id)

    let offset = 44
    mean37 = row.getUint8(offset)
    n37 = row.getUint8(offset + 1)
    min37 = row.getUint8(offset + 2)
    max37 = row.getUint8(offset + 3)
    std237 = row.getUint16(offset + 4, true)

    offset = 50
    mean38 = row.getUint8(offset)
    n38 = row.getUint8(offset + 1)
    min38 = row.getUint8(offset + 2)
    max38 = row.getUint8(offset + 3)
    std238 = row.getUint16(offset + 4, true)

    offset = 56
    mean39 = row.getUint8(offset)
    n39 = row.getUint8(offset + 1)
    min39 = row.getUint8(offset + 2)
    max39 = row.getUint8(offset + 3)
    std239 = row.getUint16(offset + 4, true)
    flag = row.getUint8(62)
    flag2 = row.getUint8(63)

    let array_row = [
      date_string, epoch_minute, first, last,
      mean37, n37, min37, max37, std237,
      mean38, n38, min38, max38, std238,
      mean39, n39, min39, max39, std239,
      flag, flag2, id
    ]
    let means = []
    if (n37) means.push(mean37)
    if (n38) means.push(mean38)
    if (n39) means.push(mean39)
    // array_row = [flag, flag2]
    // Add checks before we add to file
    // 1.. Valid crypto flag==7
    // 2.. Duration is greater than >30 seconds
    //
    if (flag == 7) {
      matrix.push(array_row)
    } else {
      // console.log('index: ' + index)
      // console.log(array_row)
    }
  }

  // return convertToCsv(matrix)
  return matrix
}

function compare(a, b) {
  for (let i = a.length; - 1 < i; i -= 1) {
    if ((a[i] !== b[i])) return false;
  }
  return true;
}

export function parse_binary(raw, file) {
  let counts = raw.byteLength / 32;
  console.log('counts: ' + counts);
  let b = new Uint32Array(8);
  for (let index = 0; index < 8; index++) {
    b[index] = 0;
  }
  var last_mark = 0;
  for (let index = 0; index < counts; index++) {
    let a = new Uint32Array(raw.slice(index * 32, (index + 1) * 32));

    if (compare(a, b)) {
      console.log('marker match: ' + index)
      last_mark = index;
    }
  }
  let last_start = last_mark + 2;
  var first, last, epoch_minute, id, flag, flag2;
  var mean37, n37, min37, max37, std237;
  var mean38, n38, min38, max38, std238;
  var mean39, n39, min39, max39, std239;
  console.log('last_start: ' + last_start);
  // Should check that last_mark is < counts
  var matrix = [
    ['time', 'epoch_minute', 'first', 'last',
      'mean37', 'n37', 'min37', 'max37', 'var37',
      'mean38', 'n38', 'min38', 'max38', 'var38',
      'mean39', 'n39', 'min39', 'max39', 'var39',
      'flag', 'flag2', 'encounter_id'
    ]
  ];
  var simple_m = [
    ['time', 'rssi', 'encounter_id']
  ];

  console.log("write rows that don't pass");
  for (let index = last_start; index < counts; index += 2) {
    let row = new DataView(raw.slice(index * 32, (index + 2) * 32));
    // console.log(row)
    first = row.getUint8(6);
    last = row.getUint8(7);
    epoch_minute = row.getUint32(8, true);
    let d = new Date(epoch_minute * 60 * 1000 - 3600 * 6 * 1000);
    // console.log(d);
    let date_string = d.toISOString();
    date_string = date_string.split('.');
    date_string = date_string[0];
    let id = row.buffer.slice(12, 12 + 32);
    // console.log(id)
    id = buf2hex(id);
    // console.log(id)

    let offset = 44;
    mean37 = row.getUint8(offset);
    n37 = row.getUint8(offset + 1);
    min37 = row.getUint8(offset + 2);
    max37 = row.getUint8(offset + 3);
    std237 = row.getUint16(offset + 4, true);
    offset = 50;
    mean38 = row.getUint8(offset);
    n38 = row.getUint8(offset + 1);
    min38 = row.getUint8(offset + 2);
    max38 = row.getUint8(offset + 3);
    std238 = row.getUint16(offset + 4, true);
    offset = 56;
    mean39 = row.getUint8(offset);
    n39 = row.getUint8(offset + 1);
    min39 = row.getUint8(offset + 2);
    max39 = row.getUint8(offset + 3);
    std239 = row.getUint16(offset + 4, true);
    flag = row.getUint8(62);
    flag2 = row.getUint8(63);

    let array_row = [date_string, epoch_minute, first, last,
      mean37, n37, min37, max37, std237,
      mean38, n38, min38, max38, std238,
      mean39, n39, min39, max39, std239,
      flag, flag2, id
    ]
    let means = [];
    if (n37) means.push(mean37);
    if (n38) means.push(mean38);
    if (n39) means.push(mean39);
    let rssi = 0
    if (means.length == 0) rssi = 0;
    else rssi = Math.min(...means);
    let simple_row = [date_string, rssi, id];
    // array_row = [flag, flag2]
    // Add checks before we add to file
    // 1.. Valid crypto flag==7
    // 2.. Duration is greater than >30 seconds
    //
    if (flag == 7) {
      matrix.push(array_row);
      simple_m.push(simple_row);
    } else {
      console.log('index: ' + index);
      console.log(array_row);
    }
    // console.log(index + ":" + flag);
  }

  return matrix
}
