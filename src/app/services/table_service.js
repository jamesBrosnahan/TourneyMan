import { Table, Tables } from '../models/table';
import { Seat } from '../models/seat';

export default class TableService {

  async assign_tables_to_round(tables, round) {
    for(let tbl of tables.models) {
      tbl.round = round;
      tbl.event = round.event;

      round.add_related_to_set('tables', tbl);

      await tbl.save();
    }

    await round.save();
  }


  async generate_tables_from_arrangement(table_arrangement) {
    let tables = [];

    for(let table_num in table_arrangement) {
      const t_arr = table_arrangement[table_num];

      let new_table = new Table();
      new_table.create();
      new_table.set('name', "Table " + table_num);

      const seat_arrangement = t_arr.get_arrangement();

      for(let seat_pos in seat_arrangement) {
        const s_arr = seat_arrangement[seat_pos];

        let new_seat = new Seat();
        new_seat.create();
        new_seat.set('position', parseInt(seat_pos) + 1);
        new_seat.rank = s_arr.get_player();
        new_seat.table = new_table;
        new_table.add_related_to_set('seats', new_seat);

        await new_seat.save();
      }

      await new_table.save();
      tables.push(new_table);
    }

    return new Tables(tables);
  }


  async generate_tables(num_players) {
    let tables = [];

    let table_num = 0;

    const max_seats = 4;
    const min_seats = 3;

    let num_unseated = num_players;

    while(num_unseated != 0) {
      table_num++;

      let to_seat = 0;

      if(num_unseated % max_seats === 0) {
        // if the number not yet seated is evenly divisible by the amount
        // we normally want to seat, then seat that amount.
        to_seat = max_seats;
      }
      else if(num_unseated > min_seats) {
        // if it's not evently divisible and we have more unseated people
        // than the minimum number of seats, then seat the minimum
        to_seat = min_seats;
      } else {
        // if there are stragglers, make a table for them.
        to_seat = num_unseated;
      }

      let table = await this.generate_single_table(table_num, to_seat);
      tables.push(table);

      num_unseated -= to_seat;
    }

    return new Tables(tables);
  }  

  async generate_single_table(table_num, num_seats) {
    let new_table = new Table();
    new_table.create();
    new_table.set('name', "Table " + table_num);

    for(let sn = 1; sn <= num_seats; sn++) {
      let new_seat = new Seat();
      new_seat.create();
      new_seat.set('position', sn);
      new_seat.table = new_table;
      new_table.add_related_to_set('seats', new_seat);

      await new_seat.save();
    }

    await new_table.save();
    return new_table;
  }
  
};
