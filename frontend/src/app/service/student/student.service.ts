import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StudentService {

  private studentsSubject = new BehaviorSubject<any[]>([]);
  students$ = this.studentsSubject.asObservable(); // observable for other components

  setStudents(students: any[]) {
    this.studentsSubject.next(students);
  }

  getStudents() {
    return this.studentsSubject.getValue();
  }
}
