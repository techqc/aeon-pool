"use strict";
const bignum = require('bignum');
const cnUtil = require('cryptonote-util');
const multiHashing = require('multi-hashing');
const crypto = require('crypto');
const debug = require('debug')('coinFuncs');
const process = require('process');

let hexChars = new RegExp("[0-9a-f]+");

function Coin(data){
    this.bestExchange = global.config.payout.bestExchange;
    this.data = data;
    //let instanceId = crypto.randomBytes(4);
    let instanceId = new Buffer(4);
    instanceId.writeUInt32LE( ((global.config.pool_id % (1<<16)) << 16) + (process.pid  % (1<<16)) );
    console.log("Generated instanceId: " + instanceId.toString('hex'));
    this.coinDevAddress = "44Dx3bVEarKNGciPJSsD9BXFZASyooXpjCBCzhw3D8cANMzyyJn6PcyWbwaVe4vUMveKAzAiA4j8xgUi29TpKXpm3wUvH8Z";
    this.poolDevAddress = "4B4aRaT26owYbRvunNiSGi8gC5NK3q5BrjQ5A4FjNAzN1HeEDbbwmuoWbwaVe4vUMveKAzAiA4j8xgUi29TpKXpm3xwKtFD";

    this.blockedAddresses = [
        this.coinDevAddress,
        this.poolDevAddress,
        "464JB1RGzMsUEqVTzVjkmBCtzBfzMCSUjVFLpCtkSEXbeFctHzZxA37WbwaVe4vUMveKAzAiA4j8xgUi29TpKXpm3wP1ydr",
        "4AL3wTGNgUS14SH3M9ifRmdcqLHD23wcFLzuWNCsUY67HLxoZ6DJ9bTWbwaVe4vUMveKAzAiA4j8xgUi29TpKXpm42Ufgwk",
        "4AMxbqiUKB2dfgG9XxqMRbWs8M1DcZostQSATbdNCHi1Y4fzn8Ghf8yWbwaVe4vUMveKAzAiA4j8xgUi29TpKXpm3xkgajd",
        "4ABmKWDcTUz7wwWnbLejKPTH74cFZYWC31bb3BKZyP338K6UoVzfK9XWbwaVe4vUMveKAzAiA4j8xgUi29TpKXpm3xPRyvL"
    ];

    this.exchangeAddresses = [
        "46dfL8U3DUZ3WFubF3JTSwgPKQhAR91CRPcYqhE9rp3UAzKF2R6Z3RoWbwaVe4vUMveKAzAiA4j8xgUi29TpKXpm426ynJt",
        "46p5NffgSYBR92qLUJr679h1vXL6TgWcSbK6VoSyFyksF19PMnkPdrDWbwaVe4vUMveKAzAiA4j8xgUi29TpKXpm3xW4H64",
        "451y5RxetGc4HKrjeSvwiuMj1QCmzdKsb4JJ6iC5yjh26JgQdpAk1wKWbwaVe4vUMveKAzAiA4j8xgUi29TpKXpm41FytzK",
        "43DRnvofBygcoQLwXyFbYW1zV1HPDoFMBDovGeteidqvgRjdUVDN4WqWbwaVe4vUMveKAzAiA4j8xgUi29TpKXpm435L17p",
        "42mTYWiPTRy7nwNC5WNxAb4SFzRikdMb8MJuKizxEHryd5iBCLqVuAVWbwaVe4vUMveKAzAiA4j8xgUi29TpKXpm427p8H8",
        "48esqAdPyzG6E92mm8kS6K3nrH9fvcvyEWUWaB2TWx83fFpvNqUuoeDWbwaVe4vUMveKAzAiA4j8xgUi29TpKXpm3x6xvgw",
        "42J7NzEACKFej5QNQH7HgmjFJJxV7ap8zeBdhdmcsWDxdR7XDxUV7hXWbwaVe4vUMveKAzAiA4j8xgUi29TpKXpm42LjMN9",
        "495tBvtfqfsdJ5yJJMK2BTEPLdxfXrXzxbv9M8kyr3iVajtm13NbPRFWbwaVe4vUMveKAzAiA4j8xgUi29TpKXpm3wEhKjg",
        "49NcZrFfvwtNxPwNK7z7GmeHJnzFM7QgbHts2rk76KWb6e5kfRojEUMWbwaVe4vUMveKAzAiA4j8xgUi29TpKXpm42A2x5J",
        "42PdcvXxZT3TvoBvfNWgqALzJoj9yGCVdLrfVvLQu1985JUNYyFnNLDWbwaVe4vUMveKAzAiA4j8xgUi29TpKXpm3yqbL6h"
    ];

    this.prefix = 18;
    this.intPrefix = 19;

    if (global.config.general.testnet === true){
        this.prefix = 53;
        this.intPrefix = 54;
    }

    this.supportsAutoExchange = true;

    this.niceHashDiff = 400000;

    this.getPortBlockHeaderByID = function(port, blockId, callback){
        global.support.rpcPortDaemon(port, 'getblockheaderbyheight', {"height": blockId}, function (body) {
            if (body.hasOwnProperty('result')){
                return callback(null, body.result.block_header);
            } else {
                console.error(JSON.stringify(body));
                return callback(true, body);
            }
        });
    };

    this.getBlockHeaderByID = function(blockId, callback){
        return this.getPortBlockHeaderByID(global.config.daemon.port, blockId, callback);
    };

    this.getPortBlockHeaderByHash = function(port, blockHash, callback){
        global.support.rpcPortDaemon(port, 'getblockheaderbyhash', {"hash": blockHash}, function (body) {
            if (typeof(body) !== 'undefined' && body.hasOwnProperty('result')){
                return callback(null, body.result.block_header);
            } else {
                console.error(JSON.stringify(body));
                return callback(true, body);
            }
        });
    };

    this.getBlockHeaderByHash = function(blockHash, callback){
        return this.getPortBlockHeaderByHash(global.config.daemon.port, blockHash, callback);
    };

    this.getPortLastBlockHeader = function(port, callback){
        global.support.rpcPortDaemon(port, 'getlastblockheader', [], function (body) {
            if (typeof(body) !== 'undefined' && body.hasOwnProperty('result')){
                return callback(null, body.result.block_header);
            } else {
                console.error(JSON.stringify(body));
                return callback(true, body);
            }
        });
    };

    this.getLastBlockHeader = function(callback){
        return this.getPortLastBlockHeader(global.config.daemon.port, callback);
    };

    this.getPortBlockTemplate = function(port, callback){
        global.support.rpcPortDaemon(port, 'getblocktemplate', {
            reserve_size: 17,
            wallet_address: global.config.pool[port === global.config.daemon.port ? "address" : "address_" + port.toString()]
        }, function(body){
            return callback(body);
        });
    };

    this.getBlockTemplate = function(callback){
        return this.getPortBlockTemplate(global.config.daemon.port, callback);
    };

    this.baseDiff = function(){
        return bignum('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 16);
    };

    this.validateAddress = function(address){
        // This function should be able to be called from the async library, as we need to BLOCK ever so slightly to verify the address.
        address = new Buffer(address);
        if (cnUtil.address_decode(address) === this.prefix){
            return true;
        }
        return cnUtil.address_decode_integrated(address) === this.intPrefix;
    };

    this.validatePlainAddress = function(address){
        // This function should be able to be called from the async library, as we need to BLOCK ever so slightly to verify the address.
        address = new Buffer(address);
        return cnUtil.address_decode(address) === this.prefix;
    };

    this.convertBlob = function(blobBuffer){
        return cnUtil.convert_blob(blobBuffer);
    };

    this.constructNewBlob = function(blockTemplate, NonceBuffer){
        return cnUtil.construct_block_blob(blockTemplate, NonceBuffer);
    };

    this.getBlockID = function(blockBuffer){
        return cnUtil.get_block_id(blockBuffer);
    };

    this.BlockTemplate = function(template) {
        /*
        Generating a block template is a simple thing.  Ask for a boatload of information, and go from there.
        Important things to consider.
        The reserved space is 16 bytes long now in the following format:
        Assuming that the extraNonce starts at byte 130:
        |130-133|134-137|138-141|142-145|
        |minerNonce/extraNonce - 4 bytes|instanceId - 4 bytes|clientPoolNonce - 4 bytes|clientNonce - 4 bytes|
        This is designed to allow a single block template to be used on up to 4 billion poolSlaves (clientPoolNonce)
        Each with 4 billion clients. (clientNonce)
        While being unique to this particular pool thread (instanceId)
        With up to 4 billion clients (minerNonce/extraNonce)
        Overkill?  Sure.  But that's what we do here.  Overkill.
         */

        // Set this.blob equal to the BT blob that we get from upstream.
        this.blob = template.blocktemplate_blob;
        this.idHash = crypto.createHash('md5').update(template.blocktemplate_blob).digest('hex');
        // Set this.diff equal to the known diff for this block.
        this.difficulty = template.difficulty;
        // Set this.height equal to the known height for this block.
        this.height = template.height;
        // Set this.reserveOffset to the byte location of the reserved offset.
        this.reserveOffset = template.reserved_offset;
        // Set this.buffer to the binary decoded version of the BT blob.
        this.buffer = new Buffer(this.blob, 'hex');
        // Copy the Instance ID to the reserve offset + 4 bytes deeper.  Copy in 4 bytes.
        instanceId.copy(this.buffer, this.reserveOffset + 4, 0, 4);
        // Generate a clean, shiny new buffer.
        this.previous_hash = new Buffer(32);
        // Copy in bytes 7 through 39 to this.previous_hash from the current BT.
        this.buffer.copy(this.previous_hash, 0, 7, 39);
        // Reset the Nonce. - This is the per-miner/pool nonce
        this.extraNonce = 0;
        // The clientNonceLocation is the location at which the client pools should set the nonces for each of their clients.
        this.clientNonceLocation = this.reserveOffset + 12;
        // The clientPoolLocation is for multi-thread/multi-server pools to handle the nonce for each of their tiers.
        this.clientPoolLocation = this.reserveOffset + 8;
        // this is current daemon port
        this.port = template.port;
        this.nextBlob = function () {
            // Write a 32 bit integer, big-endian style to the 0 byte of the reserve offset.
            this.buffer.writeUInt32BE(++this.extraNonce, this.reserveOffset);
            // Convert the blob into something hashable.
            return global.coinFuncs.convertBlob(this.buffer).toString('hex');
        };
        // Make it so you can get the raw block blob out.
        this.nextBlobWithChildNonce = function () {
            // Write a 32 bit integer, big-endian style to the 0 byte of the reserve offset.
            this.buffer.writeUInt32BE(++this.extraNonce, this.reserveOffset);
            // Don't convert the blob to something hashable.  You bad.
            return this.buffer.toString('hex');
        };
    };

    this.cryptoNight = multiHashing.cryptonight;

}

module.exports = Coin;
