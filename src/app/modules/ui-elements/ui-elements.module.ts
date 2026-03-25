import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiElementsRoutingModule } from './ui-elements.routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormfieldComponent } from './elements/formfield/formfield.component';
import { SelectboxComponent } from './elements/selectbox/selectbox.component';
import { CheckboxComponent } from './elements/checkbox/checkbox.component';
import { MultiselectComponent } from './elements/multiselect/multiselect.component';
import { RadiobuttonComponent } from './elements/radiobutton/radiobutton.component';
import { AutocompleteComponent } from './elements/autocomplete/autocomplete.component';
import { QuillModule } from 'ngx-quill';
import { DoceditorComponent } from './elements/doceditor/doceditor.component';
import { TogglebuttonComponent } from './elements/togglebutton/togglebutton.component';
import { DescriptionComponent } from './elements/description/description.component';
import { ImportfileComponent } from './elements/importfile/importfile.component';
import { TaginputComponent } from './elements/taginput/taginput.component';
import { CommondeleteComponent } from './elements/commondelete/commondelete.component';
import { AlertComponent } from './elements/alert/alert.component';
import { BredcrumpComponent } from './elements/bredcrump/bredcrump.component';
import { ReadonlyComponent } from './elements/readonly/readonly.component';
import { CustomTableComponent } from './elements/custom-table/custom-table.component';
import { EditTableComponent } from './elements/edit-table/edit-table.component';
import { ViewTableComponent } from './elements/view-table/view-table.component';
import { FilterComponent } from './elements/filter/filter.component';
import { RichTextEditorComponent } from './elements/rich-text-editor/rich-text-editor.component';
import { SelectOrInputComponent } from './elements/select-or-input/select-or-input.component';
import { HasRoleDirective } from '../../shared/directives/has-role.directive';

@NgModule({
  declarations: [
    FormfieldComponent,
    SelectboxComponent,
    CheckboxComponent,
    MultiselectComponent,
    RadiobuttonComponent,
    AutocompleteComponent,
    DoceditorComponent,
    TogglebuttonComponent,
    DescriptionComponent,
    ImportfileComponent,
    TaginputComponent,
    CommondeleteComponent,
    AlertComponent,
    BredcrumpComponent,
    ReadonlyComponent,
    CustomTableComponent,
    EditTableComponent,
    ViewTableComponent,
    FilterComponent,
    RichTextEditorComponent,
    SelectOrInputComponent
  ],
  imports: [
    CommonModule,
    UiElementsRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    QuillModule.forRoot(),
    HasRoleDirective
  ],
  exports: [
    FormfieldComponent,
    SelectboxComponent,
    CheckboxComponent,
    MultiselectComponent,
    RadiobuttonComponent,
    AutocompleteComponent,
    DoceditorComponent,
    TogglebuttonComponent,
    DescriptionComponent,
    ImportfileComponent,
    TaginputComponent,
    CommondeleteComponent,
    AlertComponent,
    BredcrumpComponent,
    ReadonlyComponent,
    CustomTableComponent,
    EditTableComponent,
    ViewTableComponent,
    FilterComponent,
    RichTextEditorComponent,
    SelectOrInputComponent,
    HasRoleDirective
  ]
})
export class UiElementsModule { }