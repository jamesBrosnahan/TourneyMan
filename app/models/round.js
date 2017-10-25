'use strict';

class Round extends Model {

  constructor(data) {
    super(data);

    this.event = null;
    this.tables = null;
  }

  init_data() {
    return {
      _id: "",

      event_id: -1,
      table_ids: [],

      name: "",
      started: false,
      seated: false,
      finished: false,
    };
  }

  get_database() {
    return new PouchDB('rounds');
  }

  get_relationships() {
    return {
      'has_a': {
        'event': Event
      },
      'has_many': {
        'tables': Tables
      },
      'as_referenced_by': [
        ['round', Tables]
      ]
    }
  }

  async finish_round() {
    if(this.get('finished'))
      return;

    await this.fetch_related();

    await this.tables.each( (t) => {
      return t.fetch_related_set('seats');
    });

    await this.tables.each( async (t) => {
      let scores = t.seats.map((s) => s.get('score'));
      let score_sum = _.sum(scores);

      await t.seats.each( async (s) => {
        await s.fetch_related_model('rank');

        let rank_scores = s.rank.get('scores');
        let rank_score_pcts = s.rank.get('score_pcts');
        let rank_num_wins  = s.rank.get('num_wins');

        let seat_score = s.get('score');

        rank_scores.push(seat_score);
        rank_score_pcts.push(seat_score / score_sum);

        if(s.get('won') == true) {
          rank_num_wins += 1;
        }

        s.rank.set('scores', rank_scores);
        s.rank.set('score_pcts', rank_score_pcts);
        s.rank.set('num_wins', rank_num_wins);

        return s.rank.save();
      });
    });

    this.set('finished', true);
    await this.save();
  }
}

class Rounds extends Collection {

  get_database() {
    return new PouchDB("rounds");
  }

  get_model_class() {
    return Round;
  }

}
