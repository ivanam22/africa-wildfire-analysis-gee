var lon = 20; // Približna dužina za centriranje na Afriku
var lat = 5; // Približna širina za centriranje na Afriku
var zoom = 3;
Map.setOptions('SATELLITE');
 
// Definisanje granica za Afriku
var granica = granice.filter(ee.Filter.eq('country_na', 'Africa'));
print(granica);
// Definisanje zeljene godine
var year = 2020;

// Definisanje raspona, 12 mjeseci
var duration = 12;

// Definisanje startnog i krajnjeg datuma
var startDate = ee.Date.fromYMD(year, 1, 1);
var endDate = startDate.advance(duration, 'month');
   
// Uzimanje kolekcija
var modImage = ee.ImageCollection('MODIS/006/MOD14A1');
var mydImage = ee.ImageCollection('MODIS/006/MYD14A1');

// Funkcija za isjecanje image-a
var clipImage = function(image) {
  return image.clip(granice);
};

// Isjecanje po granicama Afrike
var modImageClipped = modImage.map(clipImage);
var mydImageClipped = mydImage.map(clipImage);

// Filtriranje po rasponu
var modImageFiltered = modImageClipped.filterDate(startDate, endDate);
var mydImageFiltered = mydImageClipped.filterDate(startDate, endDate);

var getFireMask = function(image) {
    // Vrijednosti preko 7 su aktivni pikseli
    return image.select('FireMask').gte(7);
};

// Definisanje maski za mod i myd slike
var modImageFilteredMask = modImageFiltered.map(getFireMask).sum();
var mydImageFilteredMask = mydImageFiltered.map(getFireMask).sum();

// FRP(Fire Radiative Power) (MaxFRP): Pomnozeno sa 0.1 da bi bilo u MW(MegaWatt)
var getMaxFRP = function(image) {
    return image.select('MaxFRP').multiply(0.1);
};

// Definisanje FRP za mod i myd
var modImageFilteredFrp = modImageFiltered.map(getMaxFRP).sum();
var mydImageFilteredFrp = mydImageFiltered.map(getMaxFRP).sum();

// Uzimanje kolekcija za izgorjele povrsi
var burnedImage = ee.ImageCollection('MODIS/006/MCD64A1');

// Isjecanje
var burnedImageClipped = burnedImage.map(clipImage);

// Funkcija za dobijanje datuma pozara
var getBurnDate = function(image) {
    return image.select('BurnDate');
};

// Filtriranje po datumu izgorjele povrsi
var burnedImageFiltered = burnedImageClipped.filterDate(startDate, endDate);

// Kreiranje maske
var burnedImageFilteredMask = burnedImageFiltered.map(getBurnDate).min();


// Dodavanje layer-a na mapu
/*Map.addLayer(modImageFilteredMask.selfMask(), {
    palette: 'orange'
}, 'MOD active fire');

Map.addLayer(mydImageFilteredMask.selfMask(), {
    palette: 'red'
}, 'MYD active fire');

Map.addLayer(burnedImageFilteredMask.selfMask(), {
    palette: 'black'
}, 'Burned area');

Map.addLayer(modImageFilteredFrp.selfMask(), {
    palette: 'yellow'
}, 'MOD frp');

Map.addLayer(mydImageFilteredFrp.selfMask(), {
    palette: 'green'
}, 'MYD frp');
*/
Map.setCenter(lon, lat, zoom);


// Kreiranje interaktivnog panela za odabir lejera
var layerSelect = ui.Select({
  items: ['Main','MOD active fire', 'MYD active fire', 'Burned area', 'MOD frp', 'MYD frp'],
  onChange: function(selected) {
    Map.layers().forEach(function(layer) {
      Map.layers().remove(layer);
    });
    if (selected === 'MOD active fire') {
      Map.addLayer(modImageFilteredMask.selfMask(), {palette: 'orange'}, 'MOD active fire');
    } else if (selected === 'MYD active fire') {
      Map.addLayer(mydImageFilteredMask.selfMask(), {palette: 'red'}, 'MYD active fire');
    } else if (selected === 'Burned area') {
      Map.addLayer(burnedImageFilteredMask.selfMask(), {palette: 'black'}, 'Burned area');
    } else if (selected === 'MOD frp') {
      Map.addLayer(modImageFilteredFrp.selfMask(), {palette: 'yellow'}, 'MOD frp');
    } else if (selected === 'MYD frp') {
      Map.addLayer(mydImageFilteredFrp.selfMask(), {palette: 'green'}, 'MYD frp');
    } else if (selected === 'Main') {
      Map.addLayer(mydImageFilteredFrp.selfMask(), {palette: 'Default map'}, 'Main');
    }  
  },
  style: {position: 'top-left',
    width: '300px',
    padding: '10px'
  }
});

// Dodavanje panela na mapu
Map.add(layerSelect);

var mapPanel = ui.Map();
mapPanel.setControlVisibility({all: false, zoomControl: true, mapTypeControl: true});

var header = ui.Label('Afrika', {fontSize: '35px', color: 'black'});
var text = ui.Label(
    'Prikaz požara koji su se desili na teritoriji Afrike.',
    {fontSize: '13px'});

var toolPanel = ui.Panel([header, text], 'flow', {width: '300px'});
ui.root.widgets().add(toolPanel);

var link = ui.Label(
    'Story Map', {},
    'https://storymaps.arcgis.com/stories/a7fb0e4148ae4a5793d08874fc622dbc');
var linkPanel = ui.Panel(
    [ui.Label('Za više informacija kliknite na link:', {fontWeight: 'italic'}), link]);
toolPanel.add(linkPanel);

var legend = ui.Panel({
  style: {
    position: 'bottom-right',
    padding: '10px 15px'
  }
});

var legendTitle = ui.Label({
  value: 'Legenda',
  style: {
    fontWeight: 'bold',
    fontSize: '16px',
    margin: '0 0 4px 0',
    padding: '0'
    }
});
legend.add(legendTitle);


// Legenda 
// Pozicioniranje panela
var legend = ui.Panel({
  style: {
    position: 'bottom-right',
    padding: '10px 15px'
  }
});
 
// Kreiranje naslova legenda i podesavanje velicine slova i ostalih parametara
var legendTitle = ui.Label({
  value: 'Legenda',
  style: {
    fontWeight: 'bold',
    fontSize: '16px',
    margin: '0 0 4px 0',
    padding: '0'
  }
});
legend.add(legendTitle);

toolPanel.add(legend);
 
// Kreiranje i stilizovanje prvog reda legende 
var makeRow = function(color, name) {
 
      // Kreiranje boje pored naziva 
      var colorBox = ui.Label({
        style: {
          backgroundColor: color, // Uklonjeno "#" ispred boje
          // Koriscenje paddinga kako bi podesili visinu i sirinu colorBox-a
          padding: '8px',  
          margin: '0 0 4px 0'
        }
      });
 
      // Kreiranje opisa pored boje
      var description = ui.Label({
        value: name,
        style: {margin: '0 0 4px 6px'}
      });
 
     
      return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
      });
};
 
//  Paleta, boje i nazivi
var palette = ['#ffa500', '#ff0000', '#000000', '#ffff00', '#008000']; // Dodan "#" ispred svake boje

// Nazivi u legendi
var names = ['MOD active fire', 'MYD active fire', 'Burned area', 'MOD frp', 'MYD frp'];

for (var i = 0; i < 5; i++) {
  legend.add(makeRow(palette[i], names[i]));
}  
 

/*Export.image.toDrive({
  image: modImageFilteredMask,
  description: 'modImageFilteredMask',
});
Export.image.toDrive({
  image: mydImageFilteredMask,
  description: 'mydImageFilteredMask',
});
Export.image.toDrive({
  image: burnedImageFilteredMask,
  description: 'burnedImageFilteredMask',
});
Export.image.toDrive({
  image: modImageFilteredFrp,
  description: 'modImageFilteredFrp',
});
Export.image.toDrive({
  image: mydImageFilteredFrp,
  description: 'mydImageFilteredFrp',
});*/

