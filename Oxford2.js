/* global api, hash */
class Oxford {
    constructor(options) {
        this.options = options;
        this.maxexample = 2;
        this.word = '';
    }

    async displayName() {
        return 'Oxford 2';
    }


    setOptions(options) {
        this.options = options;
        this.maxexample = options.maxexample;
    }

    async findTerm(word) {
        this.word = word;
        let deflection = await api.deinflect(word) || [];
        let promises = [word, deflection].map(x => this.findOxford(x));
        let results = await Promise.all(promises);
        return [].concat(...results).filter(x => x);
    }

    async findOxford(word) {
        // helper function
        function buildDefinitionBlock(exp, pos, defs) {
            if (!defs || !Array.isArray(defs) || defs.length < 0) return '';
            let definition = '';
            let sentence = '';
            let sentnum = 0;
            for (const def of defs) {
                if (def.text) definition += `<span class='tran'><span class='eng_tran'>${def.text}</span></span>`;
                if (def.tag == 'id' || def.tag == 'pv')
                    definition += def.enText ? `<div class="idmphrase">${def.enText}</div>` : '';
                //if (def.tag == 'xrs')
                //    definition += `<span class='tran'><span class='eng_tran'>${def.data[0].data[0].text}</span></span>`;
                if (def.tag == 'd' || def.tag == 'ud')
                    definition += pos + `<span class='tran'><span class='eng_tran'>${def.enText}</span></span>`;
                if (def.tag == 'x' && sentnum < maxexample) {
                    sentnum += 1;
                    let enText = def.enText.replace(RegExp(exp, 'gi'), `<b>${exp}</b>`);
                    sentence += `<li class='sent'><span class='eng_sent'>${enText}</span></li>`;
                }
            }
            definition += sentence ? `<ul class="sents">${sentence}</ul>` : '';
            return definition;
        }
        const maxexample = this.maxexample;

    static renderCSS() {
        let css = `
            <style>
                div.dis {font-weight: bold;margin-bottom:3px;padding:0;}
                span.grammar,
                span.informal   {margin: 0 2px;color: #0d47a1;}
                span.complement {margin: 0 2px;font-weight: bold;}
                div.idmphrase {font-weight: bold;margin: 0;padding: 0;}
                span.eng_dis  {margin-right: 5px;}
                span.chn_dis  {margin: 0;padding: 0;}
                span.pos  {text-transform:lowercase; font-size:0.9em; margin-right:5px; padding:2px 4px; color:white; background-color:#0d47a1; border-radius:3px;}
                span.tran {margin:0; padding:0;}
                span.eng_tran {margin-right:3px; padding:0;}
                ul.sents {font-size:0.9em; list-style:square inside; margin:3px 0;padding:5px;background:rgba(13,71,161,0.1); border-radius:5px;}
                li.sent  {margin:0; padding:0;}
                span.eng_sent {margin-right:5px;}
            </style>`;
        return css;
    }
}
