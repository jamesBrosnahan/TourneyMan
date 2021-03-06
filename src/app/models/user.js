'use strict';

import ncrypt from 'crypto';
import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';

PouchDB.plugin(PouchDBFind);

import Model from '../framework/model';
import Collection from '../framework/collection';

import { Events } from './event';
import { Tournaments } from './tournament';
import { EventTemplates } from './event_template';
import { TournamentTemplates } from './tournament_template';
import { Ranks } from './rank';

export class User extends Model {

  constructor(data) {
    super(data);

    this.events = null;
    this.organized_events = null;
    this.organized_tournaments = null;
    this.event_templates = null;
    this.tournament_templates = null;
    this.authenticated = false;
  }

  init_data() {
    return {
      _id: -1,
      event_ids: [],
      organized_event_ids: [],
      organized_tournament_ids: [],
      event_template_ids: [],
      tournament_template_ids: [],

      global_admin: false,
      admin: false,
      developer: false,
      name: "",
      email: "",
      phone_number: "",
      address: "",
      city: "",
      state: "",
      zip_code: ""
    };
  }

  get_database() {
    return new PouchDB('users');
  }

  get_relationships() {
    return { 'has_many': {
        'events': Events,
        'organized_events': Events,
        'organized_tournaments': Tournaments,
        'event_templates': EventTemplates,
        'tournament_templates': TournamentTemplates,
      },
      'as_referenced_by': [
        ['organizer', Events],
        ['organizer', EventTemplates],
        ['organizer', Tournaments],
        ['organizer', TournamentTemplates],
        ['player', Ranks]
      ]
    }
  }

  async randomize() {
    let name = chance.name();
    let email = chance.email();
    let pass = chance.word({syllables: 5});

    await this.register(name, email, pass);

    this.from_view_model({
      phone_number: chance.phone(),
      address: chance.address(),
      city: chance.city(),
      state: chance.state(),
      zip_code: chance.zip()
    });
    this.save();
  }

  async register(name, email, password) {
    let db = this.get_database();

    let user_count = 0;

    let info = await db.info();
    user_count = info.doc_count;

    let result = await db.find({
      selector: {"email": email},
      fields: ["_id"]
    });

    if(result.docs.length > 0)  {
      reject("Error: User already exists.");
      return;
    }

    this._data._id = chance.guid();
    this._data.name = name;
    this._data.email = email.toLowerCase();

    if(user_count === 0) {
      this._data.admin = true;
      this._data.global_admin = true;
    }

    result = await db.put(this._data);
    this._data._rev = result._rev;

    await this.set_password(password);
  }

  async authenticate(email_cs, password) {
    let db = this.get_database();

    let email = email_cs.toLowerCase();

    let result = await db.find({
      selector: {email: email},
    });
      
    let user = result.docs[0];

    if(user === undefined)
      return null;

    let encrypted = this.__get_hash(password, user.salt);

    if(encrypted != user.password)
      return null;

    this._data = user;
    this.authenticated = true;

    return this.to_view_model();
  }

  async set_password(password) {
    let db = this.get_database();

    let salt = ncrypt.randomBytes(256).toString('hex');
    let encrypted = this.__get_hash(password, salt);

    let doc = await db.get(this._data._id);
    this._data = doc;
    this._data.salt = salt;
    this._data.password = encrypted;

    let result = await db.put(this._data);
    this._data._rev = result.rev;
    return this.to_view_model();
  }

  generate_random_password() {
    return chance.string({
      length: 10,
      pool: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789"
    });
  }

  __get_hash(password, salt) {
    let key = ncrypt.pbkdf2Sync(password, salt, 10000, 512, 'sha512');
    return key.toString('hex');
  }

  promote() {
    this.set('admin', true);
  }

  demote() {
    if(this.get('global_admin') === false)
      this.set('admin', false);
  }

  enable_developer_mode() {
    this.set('developer', true);
  }

  disable_developer_mode() {
    this.set('developer', false);
  }

  is_developer() {
    return this._data.developer;
  }

  is_superuser() {
    return this._data.admin;
  }

  is_global_superuser() {
    return this._data.global_admin;
  }

  logout() {
    this.authenticated = false;
    this._data = null;
  }

  /*fetch_related() {
    this.events = new Events();

    return this.events.fetch_by_ids(this._data.event_ids);
  }*/

}

export class Users extends Collection {

  get_database() {
    return new PouchDB("users");
  }

  get_model_class() {
    return User;
  }

}
