import { TextEditorComponent } from './../text-editor/text-editor.component';
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { TemplateService } from 'src/app/services/template.service';
import { Template } from 'src/app/entities/template/template';


import { LCCPipe } from './../myPipes/lcc.pipe';
import { UCCPipe } from '../myPipes/ucc.pipe';
import { Ace } from 'ace-builds';
import { ParseTemplateHelperService } from '../parse-template-helper.service';
import { PipeManagerService } from '../myPipes/pipe-manager.service';
import { AuthService } from 'src/app/services/auth.service';
import { TemplateInfo } from 'src/app/entities/templateInfo/template-info';




@Component({
  selector: 'app-generate',
  templateUrl: './generate.component.html',
  styleUrls: ['./generate.component.css']
})

export class GenerateComponent implements OnInit {
  @ViewChild(TextEditorComponent) textEditorComponent: TextEditorComponent;
  ngAfterViewInit() {
    this.codeEditor = this.textEditorComponent.codeEditor;
    this.codeEditor.setReadOnly(true);
    let templateId = this.currentroute.snapshot.paramMap.get('id');

    this.svc.show(parseInt(templateId)).subscribe(
      data => {
        this.template = data;

        this.getTempInfo(this.template.id);

        this.compileTemplates();
        this.hideNav();
      },
      err => {
        console.error(err);
      }
    );



    this.getRating(parseInt(templateId));



  }
  /*
    this is the code editor we created 'ace' is the tag function of the import.
  */
  codeEditor: Ace.Editor;
  template: Template = new Template();
  formMap = {};
  formPlaceholders = {};
  nonRegexStrings = [];
  capturedFieldNames = [];
  textEditorContent = '';
  subtemplates = {};

  currentIncrementalsCount = {};
  tempInfo: TemplateInfo = new TemplateInfo();
  rating;



  //InitiatePipes so we dont have to create it every time of use
  LCCPipeInstance = new LCCPipe(); // Lower Camel Case
  UCCPipeInstance = new UCCPipe(); // Upper Camel Case

  formList = [];




  //FIELDS
  /*
    template - template from the data base.
    formMap - Is the input field(key) and user input(value) (key/value pair -MAP) from the form that user fills out.
    nonRegexStrings - Is a string array of the raw text in between the regex capture group [nonRegexString] ?{example}? [nonRegexString] .
    capturedFieldNames -
    ==============================================================================================================
    A List of captured field names from the the Regex capture group. ?{0.0.ActualFieldName.PipeName}?.
    *                             ?{0.1.ActualFieldName.PipeName}?
    *                               0: The index of the outer Object -
    *                                 1. The index of the inner Object - example: the index of the actual field name (username, password)
    *                                   .ActualFieldName example - username, password, getter, setter
    *                                                  .PipeName - name of the pipe example LCC
    ==============================================================================================================
    textEditorContent - the text/content/code on the text editor. the non captured regex put the captured grous and pipes put together.
  */




  ngOnInit(): void {
    // if (this.buttonName) {
    //   this.buttonName = 'Unlike'
    // } else {
    //   this.buttonName = 'Like';
    // }

    // this.getTempInf.id);



  }

  constructor(
    private httpc: HttpClient,
    private currentroute: ActivatedRoute,
    private svc: TemplateService,
    private parser: ParseTemplateHelperService,
    private pipeManager: PipeManagerService,
    private router           : Router,
    private authSvc: AuthService
  ) { }


  compileTemplates() {

    let results = this.parser.compileAllTemplates(this.template, this.currentIncrementalsCount, this.formMap);
    this.formMap = results.formMap;
    this.formList = Object.getOwnPropertyNames(this.formMap);
    this.nonRegexStrings = results.nonRegexStrings;
    this.capturedFieldNames = results.capturedFieldNames;
    this.currentIncrementalsCount = results.potentialIncrementals;
    this.assemblePlaceholders();
    this.assembleFullContent();





  }

  getKeys(): string[] {
    return this.formList;
  }

  getAddButtons(): string[] {
    return Object.getOwnPropertyNames(this.currentIncrementalsCount);
  }


  assemblePlaceholders() {

    let formKey = this.getKeys();
    for (let i = 0; i < formKey.length; i++) {
      this.formPlaceholders[formKey[i]] = "input" + i;
    }
  }



  assembleFullContent() {
    this.textEditorContent = '';
    for (let i = 0; i < this.capturedFieldNames.length; i++) {
      this.textEditorContent += this.nonRegexStrings[i];
      let fieldName = this.capturedFieldNames[i].findId;
      let pipeName = this.capturedFieldNames[i].pipe;
      let rawUserInput = this.formMap[fieldName];
      if (rawUserInput == "") { rawUserInput = this.formPlaceholders[fieldName] };
      let pipe = this.pipeManager.getPipe(pipeName);
      let captueReplacement = pipe(rawUserInput);
      this.textEditorContent += captueReplacement;
    }
    this.textEditorContent += this.nonRegexStrings[this.nonRegexStrings.length - 1];
    this.codeEditor.setValue(this.textEditorContent, -1);
  }

  getTempInfo(id: number) {
    this.svc.getTemplateInformation(this.template.id).subscribe(
      data => {

        this.tempInfo = data;

      },
      err => {
        console.error(err);
      }
    );
  }


  addLike(id: number) {
    this.svc.likeTemplate(this.template.id).subscribe(
      data => {

        if (!data['ratings']) {
          this.rating = true;
        } else {
          this.rating = false;
        }
      },
      err => {
        console.error(err);
      }
    );
  }

  addField(key: string) {
    this.currentIncrementalsCount[key]++;
    this.compileTemplates();

  }


  showNav() {
    let sliders = document.getElementsByClassName("slider");
    for (let i = 0; i < sliders.length; i++) {
      sliders[i].classList.add("active");
    }
  }
  hideNav() {
    let sliders = document.getElementsByClassName("slider");
    for (let i = 0; i < sliders.length; i++) {
      sliders[i].classList.remove("active");
    }
  }


  toggleNav(){
    let sliders =  document.getElementsByClassName("slider");
    if(sliders[0].classList.contains("active")){
      this.hideNav();
    }else{
      this.showNav();
    }
  }
  displayBtnIfLoggedIn(): boolean {
    return this.authSvc.checkLogin();

  }

  getRating(id: number) {
    this.svc.getRating(id).subscribe(
      data => {
        if (data["rating"]) {
          this.rating = false;
        } else {
          this.rating = true;
        }

      }
    )

  }

getUserName(){
  if(this.tempInfo){
  return this.tempInfo["userName"];
  }else{
    return "";
  }
}
gotoCP(){
  this.router.navigateByUrl("template/edit/" + this.template.id);
}

getMyRating(){
  if(this.rating){
    return this.rating;
  }else{
    return false;
  }
}


isMine(){
  if(this.authSvc){
    return (this.authSvc.getUsername() == this.getUserName());
  }else{
    return false;
  }
}


  currentSideEditorPage = 0;


  showInstructions(){
    this.currentSideEditorPage  = 2;
  }
  showDesciption(){
    console.log(this.template)
    this.currentSideEditorPage  = 1;
  }
  showForm(){
    this.currentSideEditorPage  = 0;
  }






















}

