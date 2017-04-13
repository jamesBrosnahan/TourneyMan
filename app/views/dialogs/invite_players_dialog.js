'use strict';

class InvitePlayersDialog extends DialogView {

  constructor(event, callback) {
    super();

    this.title = "Hey, there. I have a question...";
    this.template = "invite-players-dialog";

    this.event = event;
    this.callback = callback;

    this.selected_event_sources = [];

    this.model = { 
      event: this.event.to_view_model(),
      event_choices: [],
      method_chosen: false,
      source_chosen: false,
      process_chosen: false,
      show_invite_amount: false,
      invite_amount: 8,
      method_is_events: false,
      method_is_tournaments: false,
      process: "BY_RANK"
    }

    this.events = {
      "click": {
        ".from-event": () => this.onFromEventClicked(),
        ".from-tournament": () => this.onFromTournamentClicked(),
        ".select-event": (el) => this.onSelectEventClicked(el),
        ".sources-chosen": () => this.onSourcesChosenClicked(),
        ".invite-by-rank": () => this.onInviteByRankClicked(),
        ".invite-by-random": () => this.onInviteByRandomClicked(),
        ".invite-all": () => this.onInviteAllClicked(),
        ".finalize-invites": () => this.onFinalizeInvitesClicked()
      }
    }
  }

  pre_render() {
    console.log("InvitePlayersDialog::pre_render()");

    window.user.fetch_related().then( () => {
      let organized_events = window.user.organized_events.filter( (e) => {
        return (e.get_id() !== this.event.get_id());
      });

      this.model.event_choices = organized_events.map( (e) => {
        let res = e.to_view_model();
        res.num_players = e.get('player_ids').length;
        res.num_rounds = e.get('round_ids').length;
        res.selected = false;

        return res;
      });

      this.rebind_events();
    });
  }

  onFromEventClicked() {
    console.log("InvitePlayersDialog::onFromEventClicked");
    this.model.method_chosen = true;
    this.model.method_is_events = true;
  }

  onFromTournamentClicked() {
    console.log("InvitePlayersDialog::onFromTournamentClicked");
    console.log("TODO: NOT YET SUPPORTED!");
    this.model.method_chosen = true;
    this.model.method_is_tournaments = true;
  }

  onSelectEventClicked(el) {
    console.log("InvitePlayersDialog::onSelectEventClicked");
    let selected_id = $(el.currentTarget).data('id');

    let choice = _.find(this.model.event_choices, (x) => {
      return (x._id === selected_id);
    });

    if(choice.selected) {
      choice.selected = false;

      _.remove(this.selected_event_sources, (x) => {
        return (x === selected_id);
      });
    } else {
      choice.selected = true;

      this.selected_event_sources.push(selected_id);
    }
  }

  onSourcesChosenClicked() {
    console.log("InvitePlayersDialog::onSourcesChosenClicked");

    this.model.source_chosen = true;
  }

  onInviteByRankClicked() {
    console.log("InvitePlayersDialog::onInviteByRankClicked");

    this.model.process_chosen = true;
    this.model.show_invite_amount = true;
    this.model.process = "BY_RANK";
  }

  onInviteByRandomClicked() {
    console.log("InvitePlayersDialog::onInviteByRandomClicked");

    this.model.process_chosen = true;
    this.model.show_invite_amount = true;
    this.model.process = "RANDOM";
  }

  onInviteAllClicked() {
    console.log("InvitePlayersDialog::onInviteAllClicked");

    this.model.process_chosen = true;
    this.model.show_invite_amount = false;
    this.model.process = "ALL";
  }

  onFinalizeInvitesClicked() {
    console.log("InvitePlayersDialog::onFinalizeInvitesClicked");
    console.log(this.model.invite_amount);
    console.log(this.model.process);
    console.log(this.selected_event_sources);

    let invite_from = window.user.organized_events.filter( (e) => {
      return _.includes(this.selected_event_sources, e.get_id());
    });

    let player_ids_to_invite = []
    let cur_player_ids = this.event.get('player_ids');

    let p = Promise.resolve();

    if(this.model.process === "ALL") {
      p = invite_from.each( (e) => {
        player_ids_to_invite = _.union(player_ids_to_invite, e.get('player_ids'));
      });
    } 
    else if(this.model.process === "RANDOM") {
      p = p.then( () => {
        for(let e of invite_from.models) {
          let count = this.model.invite_amount;
          let new_ids = chance.shuffle(e.get('player_ids'));

          let prev_count = player_ids_to_invite.length;
          for(let id of new_ids) {
            player_ids_to_invite = _.union(player_ids_to_invite, [id]);

            if(player_ids_to_invite.length > prev_count) {
              prev_count++;
              count--;
            }

            if(count === 0)
              break;
          }
        }
      });
    } else if(this.model.process === "BY_RANK") {
      for(let e of invite_from.models) {
        p = p.then( () => {
          return e.fetch_related_set('ranks');
        }).then( () => {
          return e.ranks.each( (r) => {
            return r.fetch_related_model('player');
          });
        }).then( () => {
          let ordered_ranks = e.get_ordered_ranks();

          let count = this.model.invite_amount;
          let new_ids = ordered_ranks.map( (r) => {
            return r.player_id;
          });

          let prev_count = player_ids_to_invite.length;
          for(let id of new_ids) {
            player_ids_to_invite = _.union(player_ids_to_invite, [id]);

            if(player_ids_to_invite.length > prev_count) {
              prev_count++;
              count--;
            }

            if(count === 0)
              break;
          }
        });
      }
    }

    let players = new Users();

    p.then( () => {
      this.start_progress("Inviting Players...");
    }).then( () => {
      this.event.set('player_ids', _.union(cur_player_ids, player_ids_to_invite));
    }).then( () => {
      return this.event.save()
    }).then( () => {
      return players.fetch_by_ids(player_ids_to_invite);
    }).then(() => {
      return players.each( (p) => {
        p.add_related_to_set('events', this.event);
        return p.save();
      });
    }).then( () => {
      this.get_element().find('.progress-text').text("Finished");
      this.finish_progress();

      this.close();
      this.callback();
    });
  }
}