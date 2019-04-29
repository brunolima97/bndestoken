import { Component, OnInit, NgZone } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';

import { Transferencia } from './Transferencia';

import { Web3Service } from './../Web3Service';
import { PessoaJuridicaService } from '../pessoa-juridica.service';

import { BnAlertsService } from 'bndes-ux4';
import { Utils } from '../shared/utils';

@Component({
  selector: 'app-transferencia',
  templateUrl: './transferencia.component.html',
  styleUrls: ['./transferencia.component.css']
})
export class TransferenciaComponent implements OnInit {

  ultimaContaBlockchainDestino: string;

  transferencia: Transferencia;
  statusHabilitacaoForm: boolean;

  maskCnpj = [/\d/, /\d/, '.', /\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/, '/', /\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/]  

  constructor(private pessoaJuridicaService: PessoaJuridicaService, protected bnAlertsService: BnAlertsService, private web3Service: Web3Service,
    private ref: ChangeDetectorRef, private zone: NgZone, private router: Router) {

      let self = this;
      setInterval(function () {
        self.recuperaContaSelecionada(), 1000});

  }

  ngOnInit() {
    this.mudaStatusHabilitacaoForm(true);
    this.inicializaTransferencia();
    this.recuperaContaSelecionada();
  }

  inicializaTransferencia() {
    this.ultimaContaBlockchainDestino = "";

    this.transferencia = new Transferencia();
    this.recuperaContaSelecionada();
    this.transferencia.cnpjDestino = "";
    this.transferencia.contaBlockchainDestino = "";
    this.transferencia.razaoSocialDestino = "";
    this.transferencia.valorTransferencia = null;
    this.transferencia.subcredito = "";
    this.transferencia.msgEmpresaDestino = ""
  }

  mudaStatusHabilitacaoForm(statusForm: boolean) {
    this.statusHabilitacaoForm = statusForm;
  }

  refreshContaBlockchainSelecionada() {
    this.inicializaTransferencia();
  }

  async recuperaContaSelecionada() {

    let self = this;
    
    let selectedAccount = this.transferencia.contaBlockchainOrigem;
    let newSelectedAccount = await this.web3Service.getCurrentAccountSync();
  
    if ( !selectedAccount || (newSelectedAccount !== selectedAccount && newSelectedAccount)) {
  
      selectedAccount = newSelectedAccount+"";
      console.log("selectedAccount=" + selectedAccount);

      this.transferencia.contaBlockchainOrigem = selectedAccount;
      this.recuperaEmpresaOrigemPorContaBlockchain(this.transferencia.contaBlockchainOrigem);
      this.ref.detectChanges();
        
    }
  
  }  
  
  recuperaEmpresaOrigemPorContaBlockchain(contaBlockchain) {

    let self = this;

    console.log("ContaBlockchain" + contaBlockchain);

    if ( contaBlockchain != undefined && contaBlockchain != "" && contaBlockchain.length == 42 ) {

      this.web3Service.getPJInfo(contaBlockchain,

          (result) => {

            if ( result.cnpj != 0 ) { //encontrou uma PJ valida  

              console.log(result);
              self.transferencia.subcredito = result.idSubcredito;
              if (self.transferencia.subcredito != "") {
                self.transferencia.papelEmpresaOrigem = "C";
              }
              self.ref.detectChanges();

           } //fecha if de PJ valida

           else {
             self.apagaCamposDaEstrutura();
             console.log("Não encontrou PJ valida para a conta blockchain");
           }
           
          },
          (error) => {
            self.apagaCamposDaEstrutura();
            console.warn("Erro ao buscar dados da conta na blockchain")
          })

      this.recuperaSaldoOrigem(contaBlockchain);        

    } 
    else {
        self.apagaCamposDaEstrutura();      
    }
}


  recuperaSaldoOrigem(contaBlockchain) {

    let self = this;

    this.web3Service.getBalanceOf(contaBlockchain,

      function (result) {
        console.log("Saldo do endereco " + contaBlockchain + " eh " + result);
        self.transferencia.saldoOrigem = result;
        self.ref.detectChanges();
      },
      function (error) {
        console.log("Erro ao ler o saldo do endereco " + contaBlockchain);
        console.log(error);
        self.transferencia.saldoOrigem = 0;
      });
  }

  recuperaInformacoesDerivadasConta() {

    if (this.transferencia.contaBlockchainDestino != "") {
      this.recuperaEmpresaDestinoPorContaBlockchain(this.transferencia.contaBlockchainDestino.toLowerCase());
    } else {
      this.transferencia.razaoSocialDestino = "";
      this.transferencia.papelEmpresaDestino = "";
      this.transferencia.cnpjDestino = "";
      this.transferencia.msgEmpresaDestino = ""
    }
  }


  recuperaEmpresaDestinoPorContaBlockchain(contaBlockchain) {

    let self = this;

    console.log("ContaBlockchain" + contaBlockchain);

    if ( contaBlockchain != undefined && contaBlockchain != "" && contaBlockchain.length == 42 ) {

      this.web3Service.getPJInfo(contaBlockchain,

          (result) => {

            if ( result.cnpj != 0 ) { //encontrou uma PJ valida  

              console.log(result);
              self.transferencia.cnpjDestino = result.cnpj;

              this.pessoaJuridicaService.recuperaEmpresaPorCnpj(self.transferencia.cnpjDestino).subscribe(
                data => {
                    if (data) {
                    console.log("RECUPERA EMPRESA DESTINO")
                    console.log(data)
                    self.transferencia.razaoSocialDestino = data.dadosCadastrais.razaoSocial;
                    this.validaEmpresaDestino(contaBlockchain);
                }
                else {
                    console.log("nenhuma empresa encontrada");
                    this.transferencia.razaoSocialDestino = "";
                    this.transferencia.papelEmpresaDestino = "";
                    this.transferencia.cnpjDestino = ""
                    this.transferencia.msgEmpresaDestino = "Conta Inválida"
                }
              },
              error => {
                  console.log("Erro ao buscar dados da empresa");
                  this.transferencia.razaoSocialDestino = "";
                  this.transferencia.papelEmpresaDestino = "";
                  this.transferencia.cnpjDestino = "";
                  this.transferencia.msgEmpresaDestino = ""
              });              

              self.ref.detectChanges();

           } //fecha if de PJ valida

           else {
             self.apagaCamposDaEstrutura();
             console.log("Não encontrou PJ valida para a conta blockchain");
           }
           
          },
          (error) => {
            self.apagaCamposDaEstrutura();
            console.warn("Erro ao buscar dados da conta na blockchain")
          })

                 
    } 
    else {
        self.apagaCamposDaEstrutura();      
    }
}

  validaEmpresaDestino(contaBlockchainDestino) {
    let self = this

    self.web3Service.isFornecedor(contaBlockchainDestino,
      (result) => {
        if (result) {
          self.transferencia.msgEmpresaDestino = "Fornecedor"
          self.transferencia.papelEmpresaDestino = "F";
        } else {
          console.log("Conta Invalida")
          self.transferencia.msgEmpresaDestino = "Conta Inválida"
          self.transferencia.papelEmpresaDestino = "";
        }
        self.ref.detectChanges()
      },
      (erro) => {
        console.log(erro)
        self.transferencia.msgEmpresaDestino = ""
      })  
  }


  transferir() {

    let self = this;

    this.recuperaContaSelecionada();

    console.log("VALOR TRANSFERENCIA")
    console.log(this.transferencia.valorTransferencia);

    //Multipliquei por 1 para a comparacao ser do valor (e nao da string)
    if ((this.transferencia.valorTransferencia * 1) > (this.transferencia.saldoOrigem * 1)) {

      console.log("saldoOrigem=" + this.transferencia.saldoOrigem);
      console.log("valorTransferencia=" + this.transferencia.valorTransferencia);

      let s = "Não é possível transferir mais do que o valor do saldo de origem.";
      this.bnAlertsService.criarAlerta("error", "Erro", s, 5);
      console.log(s);
    }
    else {

      console.log("TRANSFERIR")
      console.log(this.transferencia.contaBlockchainDestino)
      console.log(this.transferencia.valorTransferencia)

      this.web3Service.transfer(this.transferencia.contaBlockchainDestino, this.transferencia.valorTransferencia,

         (txHash) => {
          self.transferencia.hashOperacao = txHash;
          Utils.criarAlertasAvisoConfirmacao( txHash, 
                                              self.web3Service, 
                                              self.bnAlertsService, 
                                              "Transferência para cnpj " + self.transferencia.cnpjDestino + "  enviada. Aguarde a confirmação.", 
                                              "A Transferência foi confirmada na blockchain.", 
                                              self.zone);       
          self.router.navigate(['sociedade/dash-transf']);
          
          }        
        ,(error) => {
          Utils.criarAlertaErro( self.bnAlertsService, 
                                 "Erro ao transferir na blockchain", 
                                 error)  
          self.statusHabilitacaoForm = false;                                                       
        }
      );
      Utils.criarAlertaAcaoUsuario( self.bnAlertsService, 
                                    "Confirme a operação no metamask e aguarde a confirmação da transferência." )  
      self.statusHabilitacaoForm = false;                                                                  
    }
  }

  apagaCamposDaEstrutura() {

    let self = this;
    //self.pj.cnpj = "";
    //self.pj.razaoSocial = "";
    self.transferencia.subcredito = "";
    //self.pj.salic = "";
    //self.pj.status = "";
    //self.pj.hashDeclaracao = "";
    //self.hashDeclaracaoDigitado = "";
  }  


}
